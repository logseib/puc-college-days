/* =====================================================================
 * PUC College Days — v21 easter egg (7:00PM Free Time card)
 * ---------------------------------------------------------------------
 * Two arcade push-buttons in a swipeable pair, each with its own shared
 * daily tap counter. Slide 1 is the original red button (goal 3000).
 * Slide 2 is a persimmon (shu-iro) button — warmer than the site red,
 * taken from the coral in the second prize GIF — with a goal of 8781.
 * A right arrow on slide 1 (and a left arrow on slide 2), small dots,
 * and a horizontal swipe move between them. Before the goal, a reserved
 * slot sits above the button (empty, so the button never jumps). At the
 * goal the matching prize GIF appears for everyone, for the rest of that
 * day, and the slide rearranges : GIF on the left, button and counter
 * stacked on the right, arrows still at the edges. There is no popup.
 *
 * Backend : Count API (https://countapi.mileshilliard.com, no signup,
 * CORS on, Redis INCRBY, keys never expire). Endpoints used :
 *   GET /api/v1/get/<key>               → {"value":N}  (404 = not created yet = 0)
 *   GET /api/v1/hit/<key>?amount=1..100 → {"value":N}  (atomic add)
 * Keys (Pacific date, so they start over every day) :
 *   logseib-puc-college-days.puc-tap-YYYY-MM-DD    (button 1)
 *   logseib-puc-college-days.puc-tap2-YYYY-MM-DD   (button 2)
 *
 * Sync : taps update the number instantly; unsent taps are batched and
 * flushed about once a second as one ?amount=N request (max 100 each),
 * and kept in localStorage so a reload or dead signal never loses them.
 * The total is polled every ~5s while the page is visible. Failures back
 * off (1s → 30s) and retry; the number never goes backwards.
 *
 * Test params (these never touch the real keys) :
 *   ?eggtest=1        use ...puc-tap-test-... and ...puc-tap2-test-...
 *   ?counterkey=NAME  use logseib-puc-college-days.NAME for button 1
 *                     and NAME-2 for button 2
 *   ?egg=3000         show at least this many on button 1; implies eggtest
 *   ?egg2=8781        show at least this many on button 2; implies eggtest
 * ===================================================================== */
(function () {
  "use strict";

  const API = "https://countapi.mileshilliard.com/api/v1/";
  const NS = "logseib-puc-college-days.";
  const EVENT_ID = "sun-free";
  const POLL_MS = 5000;
  const FLUSH_MS = 900;
  const MAX_BATCH = 100;           // API limit per request

  const events = window.PUC_EVENTS || [];
  const idx = events.findIndex(e => e.id === EVENT_ID);
  const card = idx >= 0 ? document.querySelector('.card[data-index="' + idx + '"]') : null;
  if (!card) return;
  const block = card.querySelector(".block") || card;

  /* ---------- shared query / date ---------- */
  const params = new URLSearchParams(location.search);
  const testMode = params.has("eggtest") || params.has("egg") || params.has("egg2");
  const customKey = (params.get("counterkey") || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80);
  const wallNow = () => (window.PUC_DEBUG && window.PUC_DEBUG.now) ? window.PUC_DEBUG.now() : Date.now();
  function dayStr() {
    const d = new Date(wallNow());   // "wall ms": read with getUTC*
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function forcedOf(name) {
    return params.has(name) ? Math.max(0, parseInt(params.get(name), 10) || 0) : 0;
  }
  function commas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const PAL_RED = {
    bezel0: "#f4675c", bezel1: "#e1251b", bezel2: "#a8150d",
    well0: "#3a0503", well1: "#5e0a05", well2: "#7c0f08",
    cap0: "#ff7a6d", cap1: "#ee3a2e", cap2: "#d7221a", cap3: "#ab160e",
    dn0: "#e0473c", dn1: "#c41d14", dn2: "#8d120b",
    side0: "#7d0f08", side1: "#b3180f", side2: "#6e0c06",
    thick: "#86110a", stroke: "#7a0e07"
  };
  /* Persimmon / shu-iro: same construction as the red button, warmer and
   * a little more orange, taken from the coral in the slide-2 prize GIF. */
  const PAL_SHU = {
    bezel0: "#f08a6e", bezel1: "#c4472e", bezel2: "#8a2a18",
    well0: "#3a120a", well1: "#5c1c10", well2: "#7a2814",
    cap0: "#ff9a7c", cap1: "#e05638", cap2: "#c4472e", cap3: "#8a2a18",
    dn0: "#d25034", dn1: "#b03822", dn2: "#7a2414",
    side0: "#7a2414", side1: "#a83822", side2: "#6a1c10",
    thick: "#8a2a18", stroke: "#7a2414"
  };

  function buttonSvg(uid, pal) {
    return "" +
      '<svg class="egg-svg" viewBox="0 0 140 140" aria-hidden="true" focusable="false">' +
        "<defs>" +
          '<radialGradient id="' + uid + 'Bezel" cx="42%" cy="30%" r="75%">' +
            '<stop offset="0" stop-color="' + pal.bezel0 + '"/><stop offset=".45" stop-color="' + pal.bezel1 + '"/><stop offset="1" stop-color="' + pal.bezel2 + '"/>' +
          "</radialGradient>" +
          '<radialGradient id="' + uid + 'Well" cx="50%" cy="40%" r="60%">' +
            '<stop offset="0" stop-color="' + pal.well0 + '"/><stop offset=".8" stop-color="' + pal.well1 + '"/><stop offset="1" stop-color="' + pal.well2 + '"/>' +
          "</radialGradient>" +
          '<radialGradient id="' + uid + 'Cap" cx="40%" cy="30%" r="80%">' +
            '<stop offset="0" stop-color="' + pal.cap0 + '"/><stop offset=".38" stop-color="' + pal.cap1 + '"/><stop offset=".75" stop-color="' + pal.cap2 + '"/><stop offset="1" stop-color="' + pal.cap3 + '"/>' +
          "</radialGradient>" +
          '<radialGradient id="' + uid + 'CapDn" cx="45%" cy="38%" r="75%">' +
            '<stop offset="0" stop-color="' + pal.dn0 + '"/><stop offset=".5" stop-color="' + pal.dn1 + '"/><stop offset="1" stop-color="' + pal.dn2 + '"/>' +
          "</radialGradient>" +
          '<linearGradient id="' + uid + 'Side" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0" stop-color="' + pal.side0 + '"/><stop offset=".5" stop-color="' + pal.side1 + '"/><stop offset="1" stop-color="' + pal.side2 + '"/>' +
          "</linearGradient>" +
          '<linearGradient id="' + uid + 'Gloss" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
          "</linearGradient>" +
          '<filter id="' + uid + 'Blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4.5"/></filter>' +
        "</defs>" +
        '<ellipse class="egg-shadow" cx="72" cy="120" rx="52" ry="11" fill="#000" filter="url(#' + uid + 'Blur)"/>' +
        '<circle cx="70" cy="75" r="56" fill="' + pal.thick + '"/>' +
        '<circle cx="70" cy="69" r="56" fill="url(#' + uid + 'Bezel)"/>' +
        '<path d="M24 58 A48 48 0 0 1 108 38" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="70" cy="69" r="41.5" fill="url(#' + uid + 'Well)"/>' +
        '<circle cx="70" cy="69" r="41.5" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.5"/>' +
        '<g class="egg-cap">' +
          '<circle class="egg-cap-side" cx="70" cy="72" r="35.5" fill="url(#' + uid + 'Side)"/>' +
          '<g class="egg-cap-top">' +
            '<circle cx="70" cy="61" r="35.5" fill="url(#' + uid + 'Cap)"/>' +
            '<circle class="egg-cap-dn" cx="70" cy="61" r="35.5" fill="url(#' + uid + 'CapDn)"/>' +
            '<circle cx="70" cy="61" r="35.5" fill="none" stroke="' + pal.stroke + '" stroke-opacity=".35" stroke-width="1"/>' +
            '<ellipse class="egg-gloss" cx="60" cy="44" rx="20" ry="11" fill="url(#' + uid + 'Gloss)" transform="rotate(-18 60 44)"/>' +
          "</g>" +
        "</g>" +
      "</svg>";
  }

  const CHEVRON_L =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEVRON_R =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- one slide's counter + button ---------- */
  function makeSlide(opts) {
    const GOAL = opts.goal;
    const GIF = opts.gif;
    const forced = opts.forced;
    const showDenom = !!opts.showDenom;
    let key = opts.keyFor(dayStr());
    let server = 0;
    let pending = 0;
    let inflight = 0;
    let fails = 0;
    let nextTry = 0;
    let shown = 0;
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

    const slide = document.createElement("div");
    slide.className = "egg-slide" + (opts.slideClass ? " " + opts.slideClass : "");
    slide.setAttribute("role", "tabpanel");
    slide.setAttribute("aria-label", opts.panelLabel);
    const leftSlot = opts.arrow === "prev"
      ? '<button type="button" class="egg-arrow egg-arrow-prev" aria-label="Back to the first button">' + CHEVRON_L + "</button>"
      : "";
    const rightSlot = opts.arrow === "next"
      ? '<button type="button" class="egg-arrow egg-arrow-next" aria-label="See the other button">' + CHEVRON_R + "</button>"
      : "";
    slide.innerHTML =
      '<div class="egg-prize">' +
        '<img alt="' + opts.alt + '" width="' + opts.imgW + '" height="' + opts.imgH + '" draggable="false">' +
      "</div>" +
      '<div class="egg-btn-row">' +
        '<div class="egg-arrow-slot">' + leftSlot + "</div>" +
        '<div class="egg-stage">' +
          '<button type="button" class="egg-btn" aria-label="Tap the button">' + buttonSvg(opts.uid, opts.pal) + "</button>" +
        "</div>" +
        '<div class="egg-arrow-slot">' + rightSlot + "</div>" +
      "</div>" +
      '<div class="egg-info">' +
        '<div class="egg-count"><b class="egg-n">0</b></div>' +
        '<div class="egg-bar" aria-hidden="true"><i></i></div>' +
        '<div class="egg-status" aria-live="polite"></div>' +
      "</div>";

    const btn = slide.querySelector(".egg-btn");
    const nEl = slide.querySelector(".egg-n");
    const barEl = slide.querySelector(".egg-bar i");
    const statusEl = slide.querySelector(".egg-status");
    const gifImg = slide.querySelector(".egg-prize img");
    const arrowBtn = slide.querySelector(".egg-arrow");

    function showPrize() {
      if (!gifImg.getAttribute("src")) gifImg.src = GIF;   // load the GIF only when needed
    }
    function total() { return Math.max(forced, server + pending + inflight); }
    function render() {
      const t = Math.max(shown, total());
      shown = t;
      if (showDenom) {
        nEl.innerHTML = '<span class="egg-num">' + commas(t) + '</span><span class="egg-den"> / ' + commas(GOAL) + "</span>";
      } else {
        nEl.textContent = String(t);
      }
      barEl.style.transform = "scaleX(" + Math.min(1, t / GOAL) + ")";
      const unlocked = t >= GOAL;
      slide.classList.toggle("is-unlocked", unlocked);
      const countBit = showDenom
        ? (commas(t) + " of " + commas(GOAL) + " taps today")
        : (t + " taps today");
      btn.setAttribute("aria-label", "Tap the button. " + countBit + (unlocked ? ", prize unlocked" : ""));
      if (unlocked) {
        wasUnlocked = true;
        showPrize();
      } else {
        wasUnlocked = false;
      }
    }
    function setStatus(s) { statusEl.textContent = s; }

    function req(path, keepalive) {
      const ctl = window.AbortController ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
      return fetch(API + path, { cache: "no-store", keepalive: !!keepalive, signal: ctl ? ctl.signal : undefined })
        .then(r => {
          clearTimeout(timer);
          if (r.status === 404) return { value: 0 };
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
          pending += inflight; inflight = 0;
          savePending();
          fail(); render();
        });
    }

    function checkDay() {
      const k = opts.keyFor(dayStr());
      if (k === key) return;
      key = k; server = 0; inflight = 0; shown = 0; synced = false; wasUnlocked = false;
      loadLocal(); render(); poll();
    }

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

    function lastChance() {
      if (pending && !inflight) {
        const n = Math.min(pending, MAX_BATCH);
        pending -= n; savePending();
        try { fetch(API + "hit/" + encodeURIComponent(key) + "?amount=" + n, { keepalive: true, cache: "no-store" }).catch(() => {}); } catch (e) {}
      }
    }

    loadLocal();
    render();

    return {
      slide, btn, arrowBtn, poll, flush, checkDay, lastChance, render, showPrize, total,
      get key() { return key; },
      get server() { return server; },
      get pending() { return pending; },
      get inflight() { return inflight; },
      get synced() { return synced; }
    };
  }

  /* ---------- shell : viewport + track + dots ---------- */
  const wrap = document.createElement("div");
  wrap.className = "egg";
  const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reduced) wrap.classList.add("is-reduced");

  const viewport = document.createElement("div");
  viewport.className = "egg-viewport";
  const track = document.createElement("div");
  track.className = "egg-track";

  const slideA = makeSlide({
    uid: "eggA",
    pal: PAL_RED,
    goal: 3000,
    gif: "assets/img/egg-prize.gif",
    forced: forcedOf("egg"),
    showDenom: false,
    imgW: 420, imgH: 470,
    alt: "A student in a Thunderbird Storm hoodie shrugging",
    arrow: "next",
    panelLabel: "Button 1",
    slideClass: "egg-slide--1",
    keyFor: function (day) {
      if (customKey) return NS + customKey;
      return NS + (testMode ? "puc-tap-test-" : "puc-tap-") + day;
    }
  });
  const slideB = makeSlide({
    uid: "eggB",
    pal: PAL_SHU,
    goal: 8781,
    gif: "assets/img/egg-prize-2.gif",
    forced: forcedOf("egg2"),
    showDenom: true,
    imgW: 520, imgH: 688,
    alt: "A student in a coral and grey hoodie turning around with a bouquet of white roses, looking surprised",
    arrow: "prev",
    panelLabel: "Button 2",
    slideClass: "egg-slide--2",
    keyFor: function (day) {
      if (customKey) return NS + customKey + "-2";
      return NS + (testMode ? "puc-tap2-test-" : "puc-tap2-") + day;
    }
  });

  const slides = [slideA, slideB];
  track.appendChild(slideA.slide);
  track.appendChild(slideB.slide);
  viewport.appendChild(track);

  const dots = document.createElement("div");
  dots.className = "egg-dots";
  dots.setAttribute("role", "tablist");
  dots.setAttribute("aria-label", "Tap buttons");
  const dotBtns = [0, 1].map(i => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "egg-dot" + (i === 0 ? " is-on" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "Button " + (i + 1));
    b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    b.addEventListener("click", () => go(i));
    dots.appendChild(b);
    return b;
  });

  wrap.appendChild(viewport);
  wrap.appendChild(dots);
  block.appendChild(wrap);
  card.classList.add("has-egg");

  /* ---------- carousel motion ---------- */
  let index = 0;
  function applyTransform(px, animate) {
    const skip = animate === false || reduced;
    if (skip) wrap.classList.add("is-dragging");
    else wrap.classList.remove("is-dragging");
    if (px == null) track.style.transform = "translateX(-" + (index * 100) + "%)";
    else track.style.transform = "translateX(" + px + "px)";
    if (skip) {
      void track.offsetWidth;
      // Instant snaps re-enable the transition; an in-progress drag leaves it off.
      if (px == null && !reduced) wrap.classList.remove("is-dragging");
    }
  }
  function go(i, opts) {
    const next = i < 0 ? 0 : i > 1 ? 1 : i;
    const instant = opts && opts.instant;
    const from = index;
    index = next;
    wrap.classList.toggle("is-on-1", index === 1);
    dotBtns.forEach((b, n) => {
      b.classList.toggle("is-on", n === index);
      b.setAttribute("aria-selected", n === index ? "true" : "false");
    });
    applyTransform(null, instant ? false : true);
    if (opts && opts.focus === "arrow") {
      const a = slides[index].arrowBtn;
      if (a) a.focus({ preventScroll: true });
      else slides[index].btn.focus({ preventScroll: true });
    } else if (opts && opts.focus === "btn") {
      slides[index].btn.focus({ preventScroll: true });
    } else if (document.activeElement && from !== index) {
      // if the now-gone arrow had focus, move it to the other arrow
      const gone = slides[from] && slides[from].arrowBtn;
      if (gone && document.activeElement === gone) {
        const a = slides[index].arrowBtn;
        if (a) a.focus({ preventScroll: true });
      }
    }
  }
  if (slideA.arrowBtn) slideA.arrowBtn.addEventListener("click", () => go(1, { focus: "arrow" }));
  if (slideB.arrowBtn) slideB.arrowBtn.addEventListener("click", () => go(0, { focus: "arrow" }));

  /* swipe / drag on the prize and empty areas (not the arcade button itself) */
  const SWIPE = 40;
  let drag = null;          // { id, x, y, w, startX, locked }
  function onTarget(el) {
    return el && el.closest && !el.closest(".egg-btn, .egg-arrow, .egg-dot");
  }
  function widthOf() { return viewport.getBoundingClientRect().width || 1; }
  viewport.addEventListener("pointerdown", e => {
    if (e.button && e.button !== 0) return;
    if (drag || !onTarget(e.target)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, w: widthOf(), locked: false };
  });
  viewport.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.locked) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) { drag = null; return; }  // vertical: let the timeline scroll
      drag.locked = true;
      wrap.classList.add("is-dragging");
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (reduced) return;
    const base = -index * drag.w;
    const next = base + (e.clientX - drag.startX);
    const lo = -drag.w, hi = 0;
    const clamped = next < lo - 24 ? lo - 24 : next > hi + 24 ? hi + 24 : next;
    applyTransform(clamped, false);
    wrap.classList.add("is-dragging");
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const dx = (e && e.clientX != null ? e.clientX : drag.startX) - drag.startX;
    const locked = drag.locked;
    drag = null;
    wrap.classList.remove("is-dragging");
    if (!locked) return;
    if (dx < -SWIPE) go(index + 1);
    else if (dx > SWIPE) go(index - 1);
    else go(index);                  // snap back
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("lostpointercapture", endDrag);

  // While a horizontal swipe is locked in, stop the timeline from scrolling.
  viewport.addEventListener("touchmove", e => {
    if (drag && drag.locked) e.preventDefault();
  }, { passive: false });

  wrap.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, { focus: "arrow" }); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); go(index - 1, { focus: "arrow" }); }
  });

  go(0, { instant: true });

  /* ---------- shared loops ---------- */
  slides.forEach(s => s.poll());
  setInterval(() => { if (!document.hidden) slides.forEach(s => s.flush()); }, FLUSH_MS);
  (function loop() {
    if (!document.hidden) slides.forEach(s => { s.checkDay(); s.poll(); });
    setTimeout(loop, POLL_MS + Math.round(Math.random() * 1000));
  })();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) slides.forEach(s => { s.checkDay(); s.poll(); s.flush(); });
  });
  window.addEventListener("pagehide", () => { slides.forEach(s => s.lastChance()); });

  window.PUC_EGG = {
    get key() { return slideA.key; }, get server() { return slideA.server; },
    get pending() { return slideA.pending; }, get inflight() { return slideA.inflight; },
    get synced() { return slideA.synced; },
    total: () => slideA.total(), showPrize: () => slideA.showPrize(),
    poll: () => slideA.poll(), flush: () => slideA.flush(),
    get index() { return index; }, go
  };
  window.PUC_EGG2 = {
    get key() { return slideB.key; }, get server() { return slideB.server; },
    get pending() { return slideB.pending; }, get inflight() { return slideB.inflight; },
    get synced() { return slideB.synced; },
    total: () => slideB.total(), showPrize: () => slideB.showPrize(),
    poll: () => slideB.poll(), flush: () => slideB.flush()
  };
})();
