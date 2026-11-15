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
 *             after the last: last). Header status + rail refresh each minute.
 *  4. Map:    PUC's illustrated PDF map (rasterized), red circle(s) on the
 *             place. Pinch to zoom; once zoomed, one finger pans; double-tap
 *             resets. Until you pinch, one finger still swipes the page.
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
  function fmtIn(ms) {
    const mins = Math.max(1, Math.round(ms / MIN));
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h >= 24) { const d = Math.round(h / 24); return d + (d === 1 ? " day" : " days"); }
    return h + " hr" + (m ? " " + m + " min" : "");
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
  function statusText(it, t) {
    if (t >= it.start && t < it.end) return { text: "Now · " + fmtIn(it.end - t) + " left", now: true };
    if (t < it.start) return { text: "In " + fmtIn(it.start - t), now: false };
    return { text: "Done", now: false };
  }

  /* ---------------- 3. Render ---------------- */
  const timeline = document.getElementById("timeline");
  const rail = document.getElementById("rail");
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
      '<h2 class="title">' + esc(it.title) + "</h2>" +
      '<div class="where">' + esc(where) + (sub ? '<span class="note">' + esc(sub) + "</span>" : "") +
        (it.note ? '<span class="note">' + esc(it.note) + "</span>" : "") + "</div>" +
      (p0.img ? '<img class="photo" alt="' + esc(p0.name || "") + '" src="' + IMG_DIR + esc(p0.img) + '"' + (it.index ? ' loading="lazy"' : "") + ">" : "") +
      '<div class="map" aria-label="Campus map, ' + esc(where) + '">' +
        '<div class="map-stage"><img alt="" draggable="false" src="' + esc(MAP.src) + '"></div>' +
        '<div class="map-blur"></div><div class="map-fade"></div>' +
        '<div class="map-cap">pinch to zoom</div>' +
      "</div>";
    timeline.appendChild(card);

    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", it.title);
    b.addEventListener("click", () => scrollToIndex(it.index, true));
    rail.appendChild(b);
  });
  rail.style.setProperty("--rail-len", Math.max(0, (items.length - 1) * 30) + "px");
  const cards = Array.from(timeline.children);
  const ticks = Array.from(rail.children);

  /* ---------------- Sticky header (cross-fade) ---------------- */
  let shown = -1, front = 0;
  function fillLayer(layer, it, t) {
    const st = statusText(it, t);
    layer.querySelector(".bar-date").textContent = fmtDay(it.start);
    layer.querySelector(".bar-time").innerHTML = fmtRange(it.start, it.end);
    const s = layer.querySelector(".bar-status");
    s.textContent = st.text;
    s.classList.toggle("is-now", st.now);
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
  function updateRail(here) {
    const live = currentIndex(now());
    const t = now();
    ticks.forEach((b, i) => {
      b.classList.toggle("is-here", i === here);
      b.classList.toggle("is-live", i === live && t >= items[i].start && t < items[i].end);
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
      updateRail(v);
    });
  }, { passive: true });

  /* ---------------- 4. Map: pinch / pan / double-tap ---------------- */
  function setupMap(el, it) {
    const stage = el.querySelector(".map-stage");
    const pins = it.places.filter(p => typeof p.mapX === "number").map(p => {
      const d = document.createElement("div");
      d.className = "map-pin";
      el.insertBefore(d, el.querySelector(".map-cap"));
      return { p, d };
    });
    const v = { s: 1, x: 0, y: 0 };
    let home = null;
    stage.style.width = MAP.w + "px";
    stage.style.height = MAP.h + "px";

    function bounds() { return { w: el.clientWidth, h: el.clientHeight }; }
    function minScale() { const b = bounds(); return Math.max(b.w / MAP.w, b.h / MAP.h); }
    const MAX = 1.2;
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
    function computeHome() {
      const b = bounds();
      if (!b.w || !b.h) return null;
      // frame the circle(s): center on them, show ~4.5x the cluster's size (≈ 700–900 map px across)
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pins.forEach(({ p }) => { x0 = Math.min(x0, p.mapX - p.mapR); y0 = Math.min(y0, p.mapY - p.mapR); x1 = Math.max(x1, p.mapX + p.mapR); y1 = Math.max(y1, p.mapY + p.mapR); });
      if (!pins.length) { x0 = 0; y0 = 0; x1 = MAP.w; y1 = MAP.h; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const span = Math.max(x1 - x0, y1 - y0) * 4.2;
      const s = Math.max(minScale(), Math.min(MAX, Math.min(b.w, b.h) / span));
      return { s, x: b.w / 2 - cx * s, y: b.h / 2 - cy * s };
    }
    function reset() {
      home = computeHome(); if (!home) return;
      Object.assign(v, home); apply();
      el.classList.remove("is-engaged");
    }
    function zoomAt(fx, fy, ns) {
      const k = Math.min(MAX, Math.max(minScale(), ns)) / v.s;
      v.x = fx - (fx - v.x) * k; v.y = fy - (fy - v.y) * k; v.s *= k;
      apply();
    }
    // Touch: two fingers always pinch; one finger pans only after a pinch ("engaged").
    let t0 = null, lastTap = 0;
    const local = (t) => { const r = el.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; };
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const a = local(e.touches[0]), b = local(e.touches[1]);
        t0 = { mode: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, s: v.s, x: v.x, y: v.y };
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const a = local(e.touches[0]);
        const nowT = Date.now();
        if (nowT - lastTap < 300) { reset(); lastTap = 0; e.preventDefault(); t0 = null; return; }
        lastTap = nowT;
        t0 = el.classList.contains("is-engaged") ? { mode: "pan", px: a.x, py: a.y, x: v.x, y: v.y } : null;
      }
    }, { passive: false });
    el.addEventListener("touchmove", (e) => {
      if (!t0) return;
      if (t0.mode === "pinch" && e.touches.length === 2) {
        const a = local(e.touches[0]), b = local(e.touches[1]);
        const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const ns = Math.min(MAX, Math.max(minScale(), t0.s * d / (t0.d || 1)));
        const k = ns / t0.s;
        v.s = ns; v.x = cx - (t0.cx - t0.x) * k; v.y = cy - (t0.cy - t0.y) * k;
        apply(); e.preventDefault();
      } else if (t0.mode === "pan" && e.touches.length === 1) {
        const a = local(e.touches[0]);
        v.x = t0.x + a.x - t0.px; v.y = t0.y + a.y - t0.py;
        apply(); e.preventDefault();
      }
    }, { passive: false });
    el.addEventListener("touchend", (e) => {
      if (t0 && t0.mode === "pinch") { el.classList.add("is-engaged"); lastTap = 0; }
      if (e.touches.length === 0) t0 = null;
      else if (e.touches.length === 1 && el.classList.contains("is-engaged")) {
        const a = local(e.touches[0]); t0 = { mode: "pan", px: a.x, py: a.y, x: v.x, y: v.y };
      }
    });
    // iOS Safari page-zoom gesture events: keep them on the map
    el.addEventListener("gesturestart", e => e.preventDefault());

    // Desktop: ctrl/⌘ + wheel or trackpad pinch zooms, drag pans, double-click resets
    el.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, v.s * Math.exp(-e.deltaY * 0.01));
      el.classList.add("is-engaged");
    }, { passive: false });
    let drag = null;
    el.addEventListener("mousedown", (e) => { drag = { px: e.clientX, py: e.clientY, x: v.x, y: v.y }; e.preventDefault(); });
    window.addEventListener("mousemove", (e) => { if (!drag) return; v.x = drag.x + e.clientX - drag.px; v.y = drag.y + e.clientY - drag.py; apply(); });
    window.addEventListener("mouseup", () => { drag = null; });
    el.addEventListener("dblclick", reset);

    window.addEventListener("resize", reset);
    reset();
    return { reset };
  }
  const maps = cards.map((c, i) => setupMap(c.querySelector(".map"), items[i]));

  /* ---------------- Status refresh ---------------- */
  function refresh() { showHeader(visibleIndex(), false); updateRail(visibleIndex()); }

  /* ---------------- Boot ---------------- */
  const start = currentIndex(now());
  scrollToIndex(start, false);
  showHeader(start, false);
  updateRail(start);
  tickClock();
  requestAnimationFrame(() => { maps.forEach(m => m.reset()); scrollToIndex(start, false); });

  setInterval(tickClock, 1000);
  setTimeout(function loop() { refresh(); setTimeout(loop, MIN - (now() % MIN)); }, MIN - (now() % MIN));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh(); tickClock(); } });
  window.addEventListener("resize", () => { const i = visibleIndex(); scrollToIndex(i, false); });

  window.PUC_DEBUG = { now, items, currentIndex, scrollToIndex };
})();
