/* =====================================================================
 * PUC College Days — v17 easter egg (7:00PM Free Time card)
 * ---------------------------------------------------------------------
 * A red arcade push-button with a shared tap counter for the whole group.
 * Every press adds 1 to TODAY's total (Pacific date). At 1000 the prize
 * GIF appears in a reserved slot above the button for everyone, for the
 * rest of that day. The slot is always the same size, so the button never
 * jumps when the GIF unlocks. There is no popup.
 *
 * Backend : Count API (https://countapi.mileshilliard.com, no signup,
 * CORS on, Redis INCRBY, keys never expire). Endpoints used :
 *   GET /api/v1/get/<key>               → {"value":N}  (404 = not created yet = 0)
 *   GET /api/v1/hit/<key>?amount=1..100 → {"value":N}  (atomic add)
 * Key : logseib-puc-college-days.puc-tap-YYYY-MM-DD (Pacific date, so it
 * starts over every day).
 *
 * Sync : taps update the number instantly; unsent taps are batched and
 * flushed about once a second as one ?amount=N request (max 100 each),
 * and kept in localStorage so a reload or dead signal never loses them.
 * The total is polled every ~5s while the page is visible. Failures back
 * off (1s → 30s) and retry; the number never goes backwards.
 *
 * Test params (these never touch the real key) :
 *   ?eggtest=1        use ...puc-tap-test-YYYY-MM-DD instead
 *   ?counterkey=NAME  use logseib-puc-college-days.NAME
 *   ?egg=1000         show at least this many (forces the prize); implies eggtest
 * ===================================================================== */
(function () {
  "use strict";

  const API = "https://countapi.mileshilliard.com/api/v1/";
  const NS = "logseib-puc-college-days.";
  const GOAL = 15;   // TEMP for Logan test; set back to 1000
  const EVENT_ID = "sun-free";
  const GIF = "assets/img/egg-prize.gif";
  const POLL_MS = 5000;
  const FLUSH_MS = 900;
  const MAX_BATCH = 100;           // API limit per request

  const events = window.PUC_EVENTS || [];
  const idx = events.findIndex(e => e.id === EVENT_ID);
  const card = idx >= 0 ? document.querySelector('.card[data-index="' + idx + '"]') : null;
  if (!card) return;
  const block = card.querySelector(".block") || card;

  /* ---------- key for today (Pacific; honors ?now= demo time) ---------- */
  const params = new URLSearchParams(location.search);
  const forced = params.has("egg") ? Math.max(0, parseInt(params.get("egg"), 10) || 0) : 0;
  const testMode = params.has("eggtest") || params.has("egg");
  const customKey = (params.get("counterkey") || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80);
  const wallNow = () => (window.PUC_DEBUG && window.PUC_DEBUG.now) ? window.PUC_DEBUG.now() : Date.now();
  function dayStr() {
    const d = new Date(wallNow());   // "wall ms": read with getUTC*
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function keyFor(day) {
    if (customKey) return NS + customKey;
    return NS + (testMode ? "puc-tap-test-" : "puc-tap-") + day;
  }

  /* ---------- state ---------- */
  let key = keyFor(dayStr());
  let server = 0;        // last confirmed server total
  let pending = 0;       // taps not sent yet
  let inflight = 0;      // taps in the request being sent
  let fails = 0;
  let nextTry = 0;       // backoff gate (ms timestamp)
  let shown = 0;         // never show a smaller number than before
  let wasUnlocked = false;
  let synced = false;

  const LS = window.localStorage;
  const lsGet = k => { try { return LS.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { LS.setItem(k, v); } catch (e) {} };
  const pendKey = () => "egg-pending:" + key;
  function loadLocal() {
    pending = Math.max(0, parseInt(lsGet(pendKey()), 10) || 0);
  }
  const savePending = () => lsSet(pendKey(), String(pending + inflight));

  /* ---------- UI ---------- */
  const SVG = '' +
    '<svg class="egg-svg" viewBox="0 0 140 140" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<radialGradient id="eggBezel" cx="42%" cy="30%" r="75%">' +
          '<stop offset="0" stop-color="#f4675c"/><stop offset=".45" stop-color="#e1251b"/><stop offset="1" stop-color="#a8150d"/>' +
        '</radialGradient>' +
        '<radialGradient id="eggWell" cx="50%" cy="40%" r="60%">' +
          '<stop offset="0" stop-color="#3a0503"/><stop offset=".8" stop-color="#5e0a05"/><stop offset="1" stop-color="#7c0f08"/>' +
        '</radialGradient>' +
        '<radialGradient id="eggCap" cx="40%" cy="30%" r="80%">' +
          '<stop offset="0" stop-color="#ff7a6d"/><stop offset=".38" stop-color="#ee3a2e"/><stop offset=".75" stop-color="#d7221a"/><stop offset="1" stop-color="#ab160e"/>' +
        '</radialGradient>' +
        '<radialGradient id="eggCapDn" cx="45%" cy="38%" r="75%">' +
          '<stop offset="0" stop-color="#e0473c"/><stop offset=".5" stop-color="#c41d14"/><stop offset="1" stop-color="#8d120b"/>' +
        '</radialGradient>' +
        '<linearGradient id="eggSide" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#7d0f08"/><stop offset=".5" stop-color="#b3180f"/><stop offset="1" stop-color="#6e0c06"/>' +
        '</linearGradient>' +
        '<linearGradient id="eggGloss" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<filter id="eggBlur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4.5"/></filter>' +
      '</defs>' +
      '<ellipse class="egg-shadow" cx="72" cy="120" rx="52" ry="11" fill="#000" filter="url(#eggBlur)"/>' +
      '<circle cx="70" cy="75" r="56" fill="#86110a"/>' +                          /* bezel thickness */
      '<circle cx="70" cy="69" r="56" fill="url(#eggBezel)"/>' +                   /* bezel top */
      '<path d="M24 58 A48 48 0 0 1 108 38" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="70" cy="69" r="41.5" fill="url(#eggWell)"/>' +                 /* hole */
      '<circle cx="70" cy="69" r="41.5" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.5"/>' +
      '<g class="egg-cap">' +
        '<circle class="egg-cap-side" cx="70" cy="72" r="35.5" fill="url(#eggSide)"/>' +
        '<g class="egg-cap-top">' +
          '<circle cx="70" cy="61" r="35.5" fill="url(#eggCap)"/>' +
          '<circle class="egg-cap-dn" cx="70" cy="61" r="35.5" fill="url(#eggCapDn)"/>' +
          '<circle cx="70" cy="61" r="35.5" fill="none" stroke="#7a0e07" stroke-opacity=".35" stroke-width="1"/>' +
          '<ellipse class="egg-gloss" cx="60" cy="44" rx="20" ry="11" fill="url(#eggGloss)" transform="rotate(-18 60 44)"/>' +
        '</g>' +
      '</g>' +
    '</svg>';

  const wrap = document.createElement("div");
  wrap.className = "egg";
  wrap.innerHTML =
    '<div class="egg-prize">' +
      '<img alt="A student in a Thunderbird Storm hoodie shrugging" width="420" height="470">' +
    '</div>' +
    '<button type="button" class="egg-btn" aria-label="Tap the button">' + SVG + '</button>' +
    '<div class="egg-info">' +
      '<div class="egg-count"><b class="egg-n">0</b></div>' +
      '<div class="egg-bar" aria-hidden="true"><i></i></div>' +
      '<div class="egg-status" aria-live="polite"></div>' +
    '</div>';
  block.appendChild(wrap);
  card.classList.add("has-egg");

  const btn = wrap.querySelector(".egg-btn");
  const nEl = wrap.querySelector(".egg-n");
  const barEl = wrap.querySelector(".egg-bar i");
  const statusEl = wrap.querySelector(".egg-status");
  const prizeEl = wrap.querySelector(".egg-prize");
  const gifImg = prizeEl.querySelector("img");

  /* Inline prize: the slot is always reserved. Load the GIF once and reveal it in place. */
  function showPrize() {
    if (!gifImg.getAttribute("src")) gifImg.src = GIF;   // load the ~1.1MB GIF only when needed
  }

  function total() { return Math.max(forced, server + pending + inflight); }
  function render() {
    const t = Math.max(shown, total());
    shown = t;
    nEl.textContent = String(t);
    barEl.style.transform = "scaleX(" + Math.min(1, t / GOAL) + ")";
    const unlocked = t >= GOAL;
    wrap.classList.toggle("is-unlocked", unlocked);
    btn.setAttribute("aria-label", "Tap the button. " + t + " taps today" + (unlocked ? ", prize unlocked" : ""));
    if (unlocked) {
      wasUnlocked = true;
      showPrize();
    } else {
      wasUnlocked = false;
      // Slot stays in the layout; CSS hides the img until .is-unlocked.
    }
  }
  function setStatus(s) { statusEl.textContent = s; }

  /* ---------- network ---------- */
  function req(path, keepalive) {
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
    return fetch(API + path, { cache: "no-store", keepalive: !!keepalive, signal: ctl ? ctl.signal : undefined })
      .then(r => {
        clearTimeout(timer);
        if (r.status === 404) return { value: 0 };           // key not created yet = 0 taps
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(j => {
        const v = parseInt(j && j.value, 10);
        if (isNaN(v)) throw new Error("bad value");
        return v;
      }, err => { clearTimeout(timer); throw err; });
  }
  function ok() { fails = 0; nextTry = 0; synced = true; setStatus(""); }
  function fail() {
    fails++;
    nextTry = Date.now() + Math.min(30000, 1000 * Math.pow(2, fails - 1));
    if (fails >= 2) setStatus("offline : will sync");
  }

  let polling = false;
  function poll() {
    if (polling || Date.now() < nextTry) return;
    polling = true;
    const k = key;
    req("get/" + encodeURIComponent(k))
      .then(v => { if (k === key) { if (!inflight) server = Math.max(server, v); ok(); render(); } })
      .catch(() => { fail(); })
      .then(() => { polling = false; });
  }

  function flush() {
    if (inflight || !pending || Date.now() < nextTry) return;
    const k = key;
    const n = Math.min(pending, MAX_BATCH);
    pending -= n; inflight = n;
    req("hit/" + encodeURIComponent(k) + "?amount=" + n)
      .then(v => {
        if (k !== key) return;
        inflight = 0;
        server = Math.max(server, v);
        savePending();
        ok(); render();
      })
      .catch(() => {
        if (k !== key) return;
        pending += inflight; inflight = 0;     // retry later (same taps, not lost)
        savePending();
        fail(); render();
      });
  }

  /* ---------- day rollover ---------- */
  function checkDay() {
    const k = keyFor(dayStr());
    if (k === key) return;
    key = k; server = 0; inflight = 0; shown = 0; synced = false; wasUnlocked = false;
    loadLocal(); render(); poll();
  }

  /* ---------- the button : pressed while held, one tap per press ---------- */
  let holding = null;
  function press() {
    pending++;
    savePending();
    render();
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  }
  function down(e) {
    if (e.button && e.button !== 0) return;
    if (holding !== null) return;
    holding = e.pointerId;
    btn.classList.add("is-pressed");
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    press();
  }
  function up(e) {
    if (holding === null || (e && e.pointerId !== holding)) return;
    holding = null;
    btn.classList.remove("is-pressed");
  }
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  btn.addEventListener("lostpointercapture", up);
  btn.addEventListener("contextmenu", e => e.preventDefault());
  // keyboard: Space / Enter press while held
  let keyHeld = false;
  btn.addEventListener("keydown", e => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat && !keyHeld) {
      e.preventDefault(); keyHeld = true; btn.classList.add("is-pressed"); press();
    }
  });
  btn.addEventListener("keyup", e => {
    if (e.key === " " || e.key === "Enter") { keyHeld = false; btn.classList.remove("is-pressed"); }
  });
  btn.addEventListener("click", e => e.preventDefault());

  /* ---------- loops ---------- */
  loadLocal();
  render();
  poll();
  setInterval(() => { if (!document.hidden) flush(); }, FLUSH_MS);
  (function loop() {
    if (!document.hidden) { checkDay(); poll(); }
    setTimeout(loop, POLL_MS + Math.round(Math.random() * 1000));   // jitter so 35 phones don't sync in lockstep
  })();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { checkDay(); poll(); flush(); } });
  window.addEventListener("pagehide", () => {
    // last-chance send of unsent taps (they are also saved in localStorage)
    if (pending && !inflight) {
      const n = Math.min(pending, MAX_BATCH);
      pending -= n; savePending();          // clear first: better to lose a few taps than count them twice
      try { fetch(API + "hit/" + encodeURIComponent(key) + "?amount=" + n, { keepalive: true, cache: "no-store" }).catch(() => {}); } catch (e) {}
    }
  });

  window.PUC_EGG = { get key() { return key; }, get server() { return server; }, get pending() { return pending; },
    get inflight() { return inflight; }, get synced() { return synced; }, total, showPrize, poll, flush };
})();
