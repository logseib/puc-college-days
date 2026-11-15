/* =====================================================================
 * PUC College Days — app logic (v2, no build step, no framework)
 *
 *  1. Time:   PACIFIC wall-clock time. "Wall ms" = Date.UTC(...) of the
 *             Pacific clock reading, so plain number comparisons work.
 *             Demo override: ?now=2026-11-15T10:15 (keeps ticking).
 *  2. Render: one full-screen snap card per event (title, place, photo,
 *             illustrated campus map). Date + time live in a fixed header
 *             that cross-fades when you land on another event.
 *  3. Now:    on load, jumps to the live event (before the first: first;
 *             after the last: last). Current-event outline + dot refresh each minute.
 *  Rail:   a fixed hairline in the left margin; each card carries its own
 *             bullet dot beside the title (red when live) that rides with the card
 *             and fades in as the card lands.
 *  4. Map:    ONE fixed map in the bottom third (PUC's illustrated PDF map,
 *             with Grainger/Graf tags baked into the image so they scale with pinch).
 *             When the active event changes it glides (~500 ms) to that event's
 *             place and cross-fades to its red circle(s). Pinch to zoom, one
 *             finger pans, double-tap resets; a small zoom "bump" after each settle.
 * ===================================================================== */
(function () {
  "use strict";

  const TZ = "America/Los_Angeles";
  const EVENTS = window.PUC_EVENTS || [];
  const PLACES = window.PUC_PLACES || {};
  const MAP = window.PUC_MAP || { src: "", w: 1, h: 1 };
  const IMG_DIR = "assets/img/";
  const MIN = 60 * 1000;

  /* ---------------- 1. Time ---------------- */
  const partsFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  function realPacificWall() {
    const p = {};
    partsFmt.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  }
  function parseWall(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s).trim());
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  const params = new URLSearchParams(location.search);
  const override = params.has("now") ? parseWall(params.get("now")) : NaN;
  const demo = !isNaN(override);
  const offset = demo ? override - realPacificWall() : 0;
  const now = () => realPacificWall() + offset;

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hm = w => { const d = new Date(w); return (d.getUTCHours() % 12 || 12) + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
  const ap = w => (new Date(w).getUTCHours() >= 12 ? "PM" : "AM");
  const fmtDay = w => { const d = new Date(w); return DAYS[d.getUTCDay()] + " · " + MONTHS[d.getUTCMonth()] + " " + d.getUTCDate(); };
  function fmtRange(a, b) {
    const same = ap(a) === ap(b);
    return hm(a) + (same ? "" : "<small>" + ap(a) + "</small>") + "–" + hm(b) + "<small>" + ap(b) + "</small>";
  }

  /* ---------------- 2. Data ---------------- */
  const items = EVENTS.map((e, i) => {
    const start = parseWall(e.start);
    const end = e.end ? parseWall(e.end) : start + 60 * MIN;
    const keys = [].concat(e.place || []);
    const places = keys.map(k => PLACES[k]).filter(Boolean);
    return Object.assign({}, e, { index: i, start, end, places });
  });

  /** Live event with the latest start; else next upcoming; else the last. */
  function currentIndex(t) {
    let live = -1;
    items.forEach((it, i) => { if (it.start <= t && t < it.end && (live < 0 || it.start >= items[live].start)) live = i; });
    if (live >= 0) return live;
    const next = items.findIndex(it => it.start > t);
    return next >= 0 ? next : items.length - 1;
  }

  /* ---------------- 3. Render ---------------- */
  const timeline = document.getElementById("timeline");
  const clock = document.getElementById("clock");
  const layers = Array.from(document.querySelectorAll(".bar-layer"));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  items.forEach(it => {
    const p0 = it.places[0] || {};
    const where = it.where || it.places.map(p => p.name).join(" · ");
    const sub = !it.where && p0.sub ? p0.sub : "";
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.index = it.index;
    card.innerHTML =
      '<div class="block">' +
        '<div class="current-tab" aria-hidden="true">Current event</div>' +
        '<h2 class="title"><span class="dot" aria-hidden="true"></span>' + esc(it.title) + "</h2>" +
        '<div class="where"><span class="where-k">Location:</span> ' + esc(where) + (sub ? '<span class="note">' + esc(sub) + "</span>" : "") +
          (it.note ? '<span class="note">' + esc(it.note) + "</span>" : "") + "</div>" +
        (p0.img ? '<img class="photo" alt="' + esc(p0.name || "") + '" src="' + IMG_DIR + esc(p0.img) + '"' + (it.index ? ' loading="lazy"' : "") + ">" : "") +
      "</div>";
    timeline.appendChild(card);
  });
  const cards = Array.from(timeline.children);

  /* Bullet dot: shown on the card you're arriving at / sitting on */
  function landDot(i) { if (cards[i]) cards[i].classList.add("is-arrived"); }
  function clearOtherDots(i) { cards.forEach((c, k) => { if (k !== i) c.classList.remove("is-arrived"); }); }

  /* ---------------- Sticky header (cross-fade) ---------------- */
  let shown = -1, front = 0;
  function fillLayer(layer, it, t) {
    layer.querySelector(".bar-date").textContent = fmtDay(it.start);
    layer.querySelector(".bar-time").innerHTML = fmtRange(it.start, it.end);
  }
  function showHeader(i, animate) {
    const it = items[i]; if (!it) return;
    const t = now();
    if (i === shown) { fillLayer(layers[front], it, t); return; }
    shown = i;
    if (!animate) { fillLayer(layers[front], it, t); return; }
    const back = 1 - front;
    fillLayer(layers[back], it, t);
    layers[back].classList.add("is-on");
    layers[front].classList.remove("is-on");
    front = back;
  }
  function updateRail() {
    const t = now();
    cards.forEach((c, i) => {
      const isLive = t >= items[i].start && t < items[i].end;
      c.classList.toggle("is-current", isLive);
      c.querySelector(".current-tab").setAttribute("aria-hidden", isLive ? "false" : "true");
    });
  }

  /* ---------------- Clock ---------------- */
  function tickClock() {
    clock.innerHTML = hm(now()) + (demo ? " <em>demo</em>" : "");
  }

  /* ---------------- Scrolling ---------------- */
  function visibleIndex() {
    const h = timeline.clientHeight || 1;
    return Math.max(0, Math.min(items.length - 1, Math.round(timeline.scrollTop / h)));
  }
  function scrollToIndex(i, smooth) {
    const c = cards[i]; if (!c) return;
    timeline.scrollTo({ top: c.offsetTop, behavior: smooth ? "smooth" : "auto" });
  }
  let raf = 0;
  timeline.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const v = visibleIndex();
      showHeader(v, true);
      if (v !== lastVis) { lastVis = v; landDot(v); map.show(v, true); }   // dot fades in, map glides to the new place
    });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, 140);   // scroll/snap has come to rest
  }, { passive: true });

  /* Arrival "pinch zoom bump": once per arrival on a card, hint the map is zoomable */
  let settleTimer = 0, arrived = -1, lastVis = -1;
  function onSettle() {
    const h = timeline.clientHeight || 1;
    const i = visibleIndex();
    if (Math.abs(timeline.scrollTop - i * h) > 4) return;   // not snapped yet
    landDot(i); clearOtherDots(i);                          // old dots are off screen now
    if (i === arrived) return;
    arrived = i;
    map.bump();
  }

  /* ---------------- 4. Map: one fixed map, glides between events ---------------- */
  function setupMap(el) {
    const stage = el.querySelector(".map-stage");
    const cap = el.querySelector(".map-cap");
    stage.style.width = MAP.w + "px";
    stage.style.height = MAP.h + "px";

    // one red circle per place that appears in any event; shown only for the active event
    const pinFor = {};
    items.forEach(it => it.places.forEach(p => {
      if (typeof p.mapX !== "number" || pinFor[p.name]) return;
      const d = document.createElement("div");
      d.className = "map-pin";
      el.insertBefore(d, cap);
      pinFor[p.name] = { p, d };
    }));
    const pins = Object.values(pinFor);
    const v = { s: 1, x: 0, y: 0 };
    const MAX = 1.2;
    let active = -1;
    function bounds() { return { w: el.clientWidth, h: el.clientHeight }; }
    function minScale() { const b = bounds(); return Math.max(b.w / MAP.w, b.h / MAP.h); }
    function clamp() {
      const b = bounds();
      v.s = Math.min(MAX, Math.max(minScale(), v.s));
      v.x = Math.min(0, Math.max(b.w - MAP.w * v.s, v.x));
      v.y = Math.min(0, Math.max(b.h - MAP.h * v.s, v.y));
    }
    function apply() {
      clamp();
      stage.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.s + ")";
      pins.forEach(({ p, d }) => {
        const r = Math.max(9, p.mapR * v.s);
        d.style.left = (v.x + p.mapX * v.s) + "px";
        d.style.top = (v.y + p.mapY * v.s) + "px";
        d.style.width = d.style.height = (2 * r) + "px";
      });
    }
    /** View that frames event i's circle(s). */
    function homeFor(i) {
      const b = bounds();
      if (!b.w || !b.h) return null;
      const ps = (items[i] ? items[i].places : []).filter(p => typeof p.mapX === "number");
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      ps.forEach(p => { x0 = Math.min(x0, p.mapX - p.mapR); y0 = Math.min(y0, p.mapY - p.mapR); x1 = Math.max(x1, p.mapX + p.mapR); y1 = Math.max(y1, p.mapY + p.mapR); });
      if (!ps.length) { x0 = 0; y0 = 0; x1 = MAP.w; y1 = MAP.h; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const span = Math.max(x1 - x0, y1 - y0) * 4.2;
      const s = Math.max(minScale(), Math.min(MAX, Math.min(b.w, b.h) / span));
      return { s, x: b.w / 2 - cx * s, y: b.h / 2 - cy * s };
    }

    // ---- animation: glide (pan/zoom to a target) and bump (zoom in & back) ----
    let animRaf = 0, animKind = "", pendingBump = false;
    function stopAnim() { if (animRaf) cancelAnimationFrame(animRaf); animRaf = 0; animKind = ""; }
    const ease = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);   // easeInOutCubic
    function glideTo(target, T) {
      stopAnim();
      const from = { s: v.s, x: v.x, y: v.y }, b = bounds(), t1 = performance.now();
      // interpolate the map point under the frame center + log-scale, so pan and zoom feel like one move
      const c0 = { x: (b.w / 2 - from.x) / from.s, y: (b.h / 2 - from.y) / from.s };
      const c1 = { x: (b.w / 2 - target.x) / target.s, y: (b.h / 2 - target.y) / target.s };
      animKind = "glide";
      const step = (tNow) => {
        const p = Math.min(1, (tNow - t1) / T), e = ease(p);
        const s = Math.exp(Math.log(from.s) + (Math.log(target.s) - Math.log(from.s)) * e);
        const cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
        v.s = s; v.x = b.w / 2 - cx * s; v.y = b.h / 2 - cy * s;
        apply();
        if (p < 1) animRaf = requestAnimationFrame(step);
        else { animRaf = 0; animKind = ""; if (pendingBump) { pendingBump = false; bump(); } }
      };
      animRaf = requestAnimationFrame(step);
    }
    function bump() {
      if (touching || drag) return;                       // never while the user is on the map
      if (animKind === "glide") { pendingBump = true; return; }   // after the glide lands
      if (animKind === "bump") return;
      const b = bounds(); if (!b.w) return;
      const base = { s: v.s, x: v.x, y: v.y }, fx = b.w / 2, fy = b.h / 2, T = 600, AMP = 0.06;
      const t1 = performance.now();
      animKind = "bump";
      const step = (tNow) => {
        const p = Math.min(1, (tNow - t1) / T);
        const k = 1 + AMP * Math.pow(Math.sin(Math.PI * p), 2);   // eased up & back
        v.s = base.s * k; v.x = fx - (fx - base.x) * k; v.y = fy - (fy - base.y) * k;
        apply();
        if (p < 1) animRaf = requestAnimationFrame(step);
        else { Object.assign(v, base); apply(); animRaf = 0; animKind = ""; }
      };
      animRaf = requestAnimationFrame(step);
    }

    /** Make event i the map's subject: cross-fade circles and glide (or jump) there. */
    function show(i, animate) {
      if (!items[i]) return;
      const names = items[i].places.map(p => p.name);
      pins.forEach(({ p, d }) => d.classList.toggle("is-on", names.indexOf(p.name) >= 0));
      el.setAttribute("aria-label", "Campus map: " + (items[i].where || names.join(", ")));
      active = i;
      const home = homeFor(i); if (!home) return;
      if (animate) glideTo(home, 500);
      else { stopAnim(); Object.assign(v, home); apply(); }
    }
    function reset() { show(active < 0 ? 0 : active, true); }

    function zoomAt(fx, fy, ns) {
      const k = Math.min(MAX, Math.max(minScale(), ns)) / v.s;
      v.x = fx - (fx - v.x) * k; v.y = fy - (fy - v.y) * k; v.s *= k;
      apply();
    }
    // Touch: the map is outside the scroller, so one finger pans and two fingers pinch.
    let t0 = null, touching = false, lastTap = 0;
    const local = (t) => { const r = el.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; };
    function startFrom(e) {
      if (e.touches.length >= 2) {
        const a = local(e.touches[0]), b = local(e.touches[1]);
        t0 = { mode: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, s: v.s, x: v.x, y: v.y };
      } else if (e.touches.length === 1) {
        const a = local(e.touches[0]);
        t0 = { mode: "pan", px: a.x, py: a.y, x: v.x, y: v.y };
      } else t0 = null;
    }
    el.addEventListener("touchstart", (e) => {
      stopAnim(); pendingBump = false; touching = true;
      e.preventDefault();
      if (e.touches.length === 1) {
        const nowT = Date.now();
        if (nowT - lastTap < 300) { lastTap = 0; t0 = null; reset(); return; }
        lastTap = nowT;
      } else lastTap = 0;
      startFrom(e);
    }, { passive: false });
    el.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!t0) return;
      if (t0.mode === "pinch" && e.touches.length >= 2) {
        const a = local(e.touches[0]), b = local(e.touches[1]);
        const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const ns = Math.min(MAX, Math.max(minScale(), t0.s * d / (t0.d || 1)));
        const k = ns / t0.s;
        v.s = ns; v.x = cx - (t0.cx - t0.x) * k; v.y = cy - (t0.cy - t0.y) * k;
        apply();
      } else if (t0.mode === "pan" && e.touches.length === 1) {
        const a = local(e.touches[0]);
        if (Math.abs(a.x - t0.px) + Math.abs(a.y - t0.py) > 8) lastTap = 0;   // a drag is not a tap
        v.x = t0.x + a.x - t0.px; v.y = t0.y + a.y - t0.py;
        apply();
      }
    }, { passive: false });
    const endTouch = (e) => { if (e.touches.length === 0) { t0 = null; touching = false; } else startFrom(e); };
    el.addEventListener("touchend", endTouch);
    el.addEventListener("touchcancel", endTouch);
    el.addEventListener("gesturestart", e => e.preventDefault());   // keep iOS page-zoom off the map

    // Desktop: ctrl/⌘ + wheel or trackpad pinch zooms, drag pans, double-click resets
    el.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault(); stopAnim();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, v.s * Math.exp(-e.deltaY * 0.01));
    }, { passive: false });
    let drag = null;
    el.addEventListener("mousedown", (e) => { stopAnim(); drag = { px: e.clientX, py: e.clientY, x: v.x, y: v.y }; e.preventDefault(); });
    window.addEventListener("mousemove", (e) => { if (!drag) return; v.x = drag.x + e.clientX - drag.px; v.y = drag.y + e.clientY - drag.py; apply(); });
    window.addEventListener("mouseup", () => { drag = null; });
    el.addEventListener("dblclick", reset);
    window.addEventListener("resize", () => show(active < 0 ? 0 : active, false));

    return { show, bump, reset };
  }
  const map = setupMap(document.getElementById("map"));

  /* ---------------- Status refresh ---------------- */
  function refresh() { showHeader(visibleIndex(), false); updateRail(visibleIndex()); }

  /* ---------------- Boot ---------------- */
  const start = currentIndex(now());
  scrollToIndex(start, false);
  showHeader(start, false);
  updateRail(start);
  map.show(start, false);
  tickClock();
  requestAnimationFrame(() => {
    scrollToIndex(start, false);
    lastVis = start;
    map.show(start, false);
    setTimeout(() => { landDot(start); }, 120);
    setTimeout(() => { arrived = start; map.bump(); }, 450);
  });

  setInterval(tickClock, 1000);
  setTimeout(function loop() { refresh(); setTimeout(loop, MIN - (now() % MIN)); }, MIN - (now() % MIN));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh(); tickClock(); } });
  window.addEventListener("resize", () => { const i = visibleIndex(); scrollToIndex(i, false); });

  window.PUC_DEBUG = { now, items, currentIndex, scrollToIndex, map };
})();
