/* =====================================================================
 * PUC College Days — app logic (v8, no build step, no framework)
 *
 *  1. Time:   PACIFIC wall-clock time. "Wall ms" = Date.UTC(...) of the
 *             Pacific clock reading, so plain number comparisons work.
 *             Demo override: ?now=2026-11-15T10:15 (keeps ticking).
 *  2. Render: one snap card per event (start time + title on one line,
 *             place, 3:2 photo). The fixed header is only the date
 *             ("Sunday, November 15") and the live clock (HH:MMAM).
 *             Visible labels put a space on both sides of a colon
 *             ("10:00AM : Worship", "Location : PUC Church"), except
 *             inside clock times themselves ("10:00"). Church exteriors
 *             use object-position 85% so the lawn sign stays in the crop.
 *             Places with an interior photo (church: Logan Seibold) slide
 *             exterior → interior inside the 3:2 frame after a 5s dwell
 *             on the settled card, then keep alternating; swipe away
 *             resets to the exterior. prefers-reduced-motion crossfades.
 *  3. Now:    on load, jumps to the live event (before the first: first;
 *             after the last: last). A compact "RIGHT NOW" tag sits on the title line of the
 *             live event; the rail dot is red. Both refresh each minute.
 *  Rail:   a fixed fading hairline in the left margin. Dots are fixed
 *             on that rail and driven by scroll position (no time-based
 *             animation). Each bullet travels only ~70px along the line
 *             while its card travels a full screen (parallax scale =
 *             70/cardHeight). Incoming: starts 70px below the title line
 *             at opacity 0 and lands on the title at opacity 1. Outgoing:
 *             moves up 70px and fades 1→0. Red when the event is live.
 *  4. Map:    ONE fixed map in the bottom half (PUC's illustrated PDF map,
 *             with Grainger/Graf tags baked into the image so they scale with pinch).
 *             Edge treatment is the v5 feathered rim, with a slightly
 *             taller fade on the top edge only. When the active event
 *             changes it glides (~500 ms) to that event's place and
 *             cross-fades to its red circle(s). Pinch to zoom, one
 *             finger pans, double-tap resets; a small zoom "bump" after each
 *             settle, plus a brief, very subtle flash so the map feels updated.
 *  5. Hint:   after 10s idle, a "SWIPE UP" caption (same type as
 *             "PINCH TO ZOOM") pulses just above the map. Any scroll or
 *             touch resets the timer. Hidden on the last event. If the
 *             5s photo slide would fire at the same moment, the hint
 *             waits for that 600ms ease to finish.
 * ===================================================================== */
(function () {
  "use strict";

  const TZ = "America/Los_Angeles";
  const EVENTS = window.PUC_EVENTS || [];
  const PLACES = window.PUC_PLACES || {};
  const MAP = window.PUC_MAP || { src: "", w: 1, h: 1 };
  const IMG_DIR = "assets/img/";
  const MIN = 60 * 1000;
  const DOT = 10;            // matches --dot in CSS
  const DOT_TRAVEL = 70;     // parallax travel along the rail for a full card swipe
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const hm = w => { const d = new Date(w); return (d.getUTCHours() % 12 || 12) + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
  const ap = w => (new Date(w).getUTCHours() >= 12 ? "PM" : "AM");
  const fmtDay = w => { const d = new Date(w); return WEEKDAYS[d.getUTCDay()] + ", " + MONTHS[d.getUTCMonth()] + " " + d.getUTCDate(); };
  const fmtStart = w => hm(w) + ap(w);

  /* ---------------- 2. Data ---------------- */
  const items = EVENTS.map((e, i) => {
    const start = parseWall(e.start);
    const end = e.end ? parseWall(e.end) : start + 60 * MIN;
    const keys = [].concat(e.place || []);
    const places = keys.map(k => PLACES[k]).filter(Boolean);
    const photo = (e.photo && PLACES[e.photo]) || places[0] || {};
    return Object.assign({}, e, { index: i, start, end, places, photo });
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
  const barDate = document.getElementById("bar-date");
  const dotsEl = document.getElementById("dots");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function photoHTML(p0, index) {
    if (!p0 || !p0.img) return "";
    const lazy = index ? ' loading="lazy"' : "";
    const church = p0.img === "puc-church.jpg" ? " is-church" : "";
    const ext = '<img class="photo' + church + '" alt="' + esc(p0.name || "") + '" src="' + IMG_DIR + esc(p0.img) + '"' + lazy + ">";
    if (!p0.interior) {
      return '<div class="photo-wrap">' + ext + "</div>";
    }
    const inn = '<img class="photo" alt="' + esc((p0.name || "") + " interior") + '" src="' + IMG_DIR + esc(p0.interior) + '" decoding="async">';
    return '<div class="photo-wrap"><div class="photo-track">' + ext + inn + "</div></div>";
  }

  items.forEach(it => {
    const p0 = it.photo || {};
    const where = it.where || it.places.map(p => p.name).join(" · ");
    const sub = !it.where && it.places[0] && it.places[0].sub ? it.places[0].sub : "";
    const card = document.createElement("section");
    card.className = "card";
    card.dataset.index = it.index;
    card.innerHTML =
      '<div class="block">' +
        '<h2 class="title">' +
          '<span class="lead"><span class="when">' + esc(fmtStart(it.start)) + '</span><span class="sep"> :&nbsp;</span></span>' +
          '<span class="name">' + esc(it.title) + "</span>" +
          '<span class="now-tag" aria-hidden="true">Right now</span>' +
        "</h2>" +
        '<div class="where"><span class="where-k">Location :</span> ' + esc(where) + (sub ? '<span class="note">' + esc(sub) + "</span>" : "") +
          (it.note ? '<span class="note">' + esc(it.note) + "</span>" : "") + "</div>" +
        photoHTML(p0, it.index) +
      "</div>" +
      // v10: faint down chevron below the photo (visual only); none on the last event
      (it.index < items.length - 1 ? '<div class="card-arrow" aria-hidden="true"><svg viewBox="0 0 60 12" width="60" height="12"><path d="M1 1.5 L30 10.5 L59 1.5"/></svg></div>' : "");
    timeline.appendChild(card);
  });
  const cards = Array.from(timeline.children);

  /* One fixed rail dot per event (not inside the card, so they don't travel the full swipe). */
  const dots = items.map((_, i) => {
    const d = document.createElement("div");
    d.className = "dot";
    d.dataset.index = i;
    dotsEl.appendChild(d);
    return d;
  });

  /* Landing Y of a snapped card's title (first-line center). Same for every card. */
  function titleLandingY() {
    const card = cards[0];
    if (!card) return 0;
    const title = card.querySelector(".title");
    const cs = getComputedStyle(card);
    const bcs = getComputedStyle(card.querySelector(".block"));
    const tcs = getComputedStyle(title);
    const fontSize = parseFloat(tcs.fontSize) || 22;
    const lineHeight = tcs.lineHeight === "normal" ? fontSize * 1.2 : parseFloat(tcs.lineHeight);
    return parseFloat(cs.paddingTop) + parseFloat(bcs.borderTopWidth) + parseFloat(bcs.paddingTop) + lineHeight / 2;
  }
  function titleCenterY(i) {
    const title = cards[i] && cards[i].querySelector(".title");
    if (!title) return titleLandingY();
    const tcs = getComputedStyle(title);
    const fontSize = parseFloat(tcs.fontSize) || 22;
    const lineHeight = tcs.lineHeight === "normal" ? fontSize * 1.2 : parseFloat(tcs.lineHeight);
    return title.getBoundingClientRect().top + lineHeight / 2;
  }
  function setDotCenter(el, y) {
    el.style.top = (y - DOT / 2) + "px";
  }

  /* ---------------- Sticky header (date only) ---------------- */
  let shownDay = "";
  function showHeader(i) {
    const it = items[i]; if (!it) return;
    const day = fmtDay(it.start);
    if (day !== shownDay) { barDate.textContent = day; shownDay = day; }
  }
  function updateRail() {
    const t = now();
    cards.forEach((c, i) => {
      const isLive = t >= items[i].start && t < items[i].end;
      c.classList.toggle("is-current", isLive);
      const tag = c.querySelector(".now-tag");
      if (tag) tag.setAttribute("aria-hidden", isLive ? "false" : "true");
      dots[i].classList.toggle("is-live", isLive);
    });
  }

  /* ---------------- Clock ---------------- */
  function tickClock() {
    clock.innerHTML = fmtStart(now()) + (demo ? " <em>demo</em>" : "");
  }

  /* ---------------- Scrolling + rail dots ---------------- */
  function cardH() {
    return (cards[0] && cards[0].offsetHeight) || timeline.clientHeight || 1;
  }
  function visibleIndex() {
    const h = cardH();
    return Math.max(0, Math.min(items.length - 1, Math.round(timeline.scrollTop / h)));
  }
  function scrollToIndex(i, smooth) {
    const c = cards[i]; if (!c) return;
    timeline.scrollTo({ top: c.offsetTop, behavior: smooth ? "smooth" : "auto" });
  }

  let settleTimer = 0, arrived = -1, lastVis = -1, raf = 0;

  /** Continuous parallax: each dot travels DOT_TRAVEL px over a full card swipe.
   *  Position and opacity are a linear function of scroll progress (no time-based animation).
   *  progress 0 (settled on i):   i at the title, opacity 1
   *  progress 0→1 (i → i+1):     i moves up DOT_TRAVEL and fades 1→0;
   *                               i+1 starts DOT_TRAVEL below the title at opacity 0
   *                               and lands on the title at opacity 1.
   *  The same function runs backward when scrolling up to a previous card. */
  function syncDots() {
    const h = cardH() || 1;
    const land = titleLandingY();
    const n = items.length;
    const maxScroll = Math.max(0, (n - 1) * h);
    const scroll = Math.max(0, Math.min(maxScroll, timeline.scrollTop));
    const raw = scroll / h;
    const i0 = Math.max(0, Math.min(n - 1, Math.floor(raw + 1e-9)));
    const i1 = Math.min(n - 1, i0 + 1);
    let p = (i0 === i1) ? 0 : raw - i0;
    if (p < 1e-4) p = 0;
    if (p > 1 - 1e-4) p = 1;

    dots.forEach((d) => {
      setDotCenter(d, land);
      d.style.transform = "translateY(0px)";
      d.style.opacity = "0";
    });

    if (p === 0 || i0 === i1) {
      const d = dots[i0];
      if (d) { d.style.transform = "translateY(0px)"; d.style.opacity = "1"; }
      return;
    }
    if (p === 1) {
      const d = dots[i1];
      if (d) { d.style.transform = "translateY(0px)"; d.style.opacity = "1"; }
      return;
    }

    const out = dots[i0], inn = dots[i1];
    if (out) {
      out.style.transform = "translateY(" + (-DOT_TRAVEL * p) + "px)";
      out.style.opacity = String(1 - p);
    }
    if (inn) {
      inn.style.transform = "translateY(" + (DOT_TRAVEL * (1 - p)) + "px)";
      inn.style.opacity = String(p);
    }
  }

  function parkDot(i) {
    const land = titleLandingY();
    dots.forEach((d, k) => {
      setDotCenter(d, land);
      d.style.transform = "translateY(0px)";
      d.style.opacity = k === i ? "1" : "0";
    });
  }

  /* Exterior/interior photo slider: 5s dwell on the settled card, 600ms
   * ease (or crossfade if prefers-reduced-motion). Instantly reset to the
   * exterior when the card is no longer the settled one. */
  const SLIDE_DWELL = 5000;
  let slideTimer = 0, slideCard = -1;
  function resetTracks(instant) {
    clearTimeout(slideTimer);
    slideTimer = 0;
    slideCard = -1;
    document.querySelectorAll(".photo-track").forEach(t => {
      if (instant) t.classList.add("no-anim");
      t.classList.remove("is-interior");
      if (instant) { void t.offsetWidth; t.classList.remove("no-anim"); }
    });
  }
  function armSlide(i) {
    clearTimeout(slideTimer);
    slideTimer = 0;
    if (i !== slideCard) {
      resetTracks(true);
      slideCard = i;
    }
    const track = cards[i] && cards[i].querySelector(".photo-track");
    if (!track) { slideCard = -1; return; }
    slideTimer = setTimeout(function tick() {
      track.classList.toggle("is-interior");
      slideTimer = setTimeout(tick, SLIDE_DWELL);
    }, SLIDE_DWELL);
  }

  /* Idle "SWIPE UP" hint: same type as pinch-to-zoom. Pulse after 10s
   * with no scroll/touch, then again every 10s while still idle. Skip
   * the last event (nowhere to swipe). If a photo slide is also due,
   * wait 800ms so the two motions don't overlap. */
  const HINT_IDLE = 10000, HINT_AFTER_SLIDE = 800;
  const hintEl = document.getElementById("scroll-hint");
  let hintTimer = 0;
  function canHint() {
    const i = arrived >= 0 ? arrived : visibleIndex();
    return i < items.length - 1;
  }
  function clearHint() {
    clearTimeout(hintTimer);
    hintTimer = 0;
    if (hintEl) hintEl.classList.remove("is-pulse");
  }
  function armHint(opts) {
    clearTimeout(hintTimer);
    hintTimer = 0;
    // keepPulse: we just started the animation and only want to schedule the next 10s
    if (hintEl && !(opts && opts.keepPulse)) hintEl.classList.remove("is-pulse");
    if (!canHint()) return;
    hintTimer = setTimeout(fireHint, HINT_IDLE);
  }
  function fireHint() {
    if (!canHint() || !hintEl) return;
    const track = cards[arrived] && cards[arrived].querySelector(".photo-track");
    const wait = (track && !reduceMotion) ? HINT_AFTER_SLIDE : 0;
    const show = () => {
      if (!canHint()) { armHint(); return; }
      hintEl.classList.remove("is-pulse");
      void hintEl.offsetWidth;
      hintEl.classList.add("is-pulse");
      nudge();                                   // v10: scroll pulse fires with the text hint
      armHint({ keepPulse: true });
    };
    if (wait) hintTimer = setTimeout(show, wait);
    else show();
  }

  /* v10 scroll pulse: like the map's zoom bump, the snapped card (and its
   * rail dot) nudges up ~24px and eases back over 650ms. Pure transform:
   * scrollTop, snap and the dot parallax math are untouched. Skipped on the
   * last event and with reduced motion. While it (and the SWIPE UP text)
   * plays, the faint down arrow steps aside so the two don't stack. */
  const NUDGE_MS = 650, NUDGE_FIRST = 1200;
  let nudgeTimer = 0;
  function nudge() {
    if (reduceMotion || !canHint()) return;
    const i = arrived >= 0 ? arrived : visibleIndex();
    const card = cards[i]; if (!card) return;
    [card, dotsEl].forEach(el => { el.classList.remove("is-nudge"); void el.offsetWidth; el.classList.add("is-nudge"); });
    document.body.classList.add("is-hinting");
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => {
      card.classList.remove("is-nudge"); dotsEl.classList.remove("is-nudge");
      document.body.classList.remove("is-hinting");
    }, 950);   // the SWIPE UP text pulse is 900ms
  }

  /* Center each card's faint arrow in the gap between its photo (block) and
   * the card's bottom edge, i.e. just above the map. Never closer than 9px
   * to the map. */
  function placeArrows() {
    cards.forEach(card => {
      const a = card.querySelector(".card-arrow"), b = card.querySelector(".block");
      if (!a || !b) return;
      const below = card.clientHeight - (b.offsetTop + b.offsetHeight) + parseFloat(getComputedStyle(b).paddingBottom || 0);
      a.style.bottom = Math.max(9, Math.round((below - a.offsetHeight) / 2)) + "px";
    });
  }

  timeline.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const v = visibleIndex();
      showHeader(v);
      if (v !== lastVis) {
        lastVis = v;
        map.show(v, true);   // map glides once the next card is the majority
        if (v !== slideCard) resetTracks(true);   // swipe away: snap back to the exterior
      }
      syncDots();
    });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, 140);   // scroll/snap has come to rest
    armHint();                                 // any scroll resets the 10s idle hint
  }, { passive: true });

  function onSettle() {
    const h = cardH();
    const i = visibleIndex();
    if (Math.abs(timeline.scrollTop - i * h) > 4) return;   // not snapped yet
    const first = arrived < 0;
    const changed = i !== arrived;
    arrived = i;
    lastVis = i;
    parkDot(i);
    armSlide(i);
    armHint();
    if (changed && !first) map.bump({ pulse: true });   // bump + pulse together after a real swipe
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
    // v9: straight-edged red outline for places with an area (Free Time = main campus)
    const SVGNS = "http://www.w3.org/2000/svg";
    const areaFor = {};
    items.forEach(it => it.places.forEach(p => {
      if (!Array.isArray(p.area) || areaFor[p.name]) return;
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "map-area");
      svg.setAttribute("viewBox", "0 0 " + MAP.w + " " + MAP.h);
      svg.setAttribute("width", MAP.w); svg.setAttribute("height", MAP.h);
      const poly = document.createElementNS(SVGNS, "polygon");
      poly.setAttribute("points", p.area.map(q => q.join(",")).join(" "));
      poly.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(poly);
      el.insertBefore(svg, cap);
      areaFor[p.name] = { p, d: svg };
    }));
    const areas = Object.values(areaFor);
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
      areas.forEach(({ d }) => { d.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.s + ")"; });
    }
    /** View that frames event i's circle(s). */
    function homeFor(i) {
      const b = bounds();
      if (!b.w || !b.h) return null;
      const ps = (items[i] ? items[i].places : []).filter(p => typeof p.mapX === "number");
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      ps.forEach(p => { x0 = Math.min(x0, p.mapX - p.mapR); y0 = Math.min(y0, p.mapY - p.mapR); x1 = Math.max(x1, p.mapX + p.mapR); y1 = Math.max(y1, p.mapY + p.mapR); });
      const as = (items[i] ? items[i].places : []).filter(p => Array.isArray(p.area));
      as.forEach(p => p.area.forEach(([ax, ay]) => { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, ax); y1 = Math.max(y1, ay); }));
      if (!ps.length && !as.length) { x0 = 0; y0 = 0; x1 = MAP.w; y1 = MAP.h; }
      if (!ps.length && as.length) {   // frame the outline itself, with a little margin
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const s = Math.max(minScale(), Math.min(MAX, Math.min(b.w / ((x1 - x0) * 1.12), b.h / ((y1 - y0) * 1.25))));
        return { s, x: b.w / 2 - cx * s, y: b.h / 2 - cy * s };
      }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const span = Math.max(x1 - x0, y1 - y0) * 4.2;
      const s = Math.max(minScale(), Math.min(MAX, Math.min(b.w, b.h) / span));
      return { s, x: b.w / 2 - cx * s, y: b.h / 2 - cy * s };
    }

    // ---- animation: glide (pan/zoom to a target) and bump (zoom in & back) ----
    let animRaf = 0, animKind = "", pendingBump = false, pendingPulse = false;
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
        else { animRaf = 0; animKind = ""; if (pendingBump) { pendingBump = false; const pul = pendingPulse; pendingPulse = false; bump({ pulse: pul }); } }
      };
      animRaf = requestAnimationFrame(step);
    }
    function pulse() {
      if (reduceMotion) return;
      el.classList.remove("is-pulse");
      void el.offsetWidth;
      el.classList.add("is-pulse");
    }
    function bump(opts) {
      const wantPulse = !!(opts && opts.pulse);
      if (touching || drag) return;                       // never while the user is on the map
      if (animKind === "glide") { pendingBump = true; pendingPulse = pendingPulse || wantPulse; return; }   // after the glide lands
      if (animKind === "bump") return;
      const b = bounds(); if (!b.w) return;
      if (wantPulse) pulse();                             // flash with the bump, only after a real swipe
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
      areas.forEach(({ p, d }) => d.classList.toggle("is-on", names.indexOf(p.name) >= 0));
      el.setAttribute("aria-label", "Campus map : " + (items[i].where || names.join(", ")));
      active = i;
      const home = homeFor(i); if (!home) return;
      if (animate) glideTo(home, 500);
      else { stopAnim(); Object.assign(v, home); apply(); }
    }
    function reset() { show(active < 0 ? 0 : active, true); }

    // ---- gestures ----
    let t0 = null, lastTap = 0, touching = false;
    function local(touch) {
      const r = el.getBoundingClientRect();
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    }
    function startFrom(e) {
      stopAnim();
      if (e.touches.length >= 2) {
        const a = local(e.touches[0]), b = local(e.touches[1]);
        t0 = { mode: "pinch", s: v.s, x: v.x, y: v.y, d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      } else if (e.touches.length === 1) {
        const a = local(e.touches[0]);
        t0 = { mode: "pan", s: v.s, x: v.x, y: v.y, px: a.x, py: a.y };
      }
    }
    function zoomAt(lx, ly, ns) {
      ns = Math.min(MAX, Math.max(minScale(), ns));
      const k = ns / v.s;
      v.s = ns; v.x = lx - (lx - v.x) * k; v.y = ly - (ly - v.y) * k;
      apply();
    }
    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      touching = true;
      if (e.touches.length === 1) {
        const t = performance.now();
        if (t - lastTap < 280) { lastTap = 0; reset(); t0 = null; return; }   // double-tap → home
        lastTap = t;
      }
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
  function refresh() { showHeader(visibleIndex()); updateRail(); }

  /* ---------------- Boot ---------------- */
  const start = currentIndex(now());
  scrollToIndex(start, false);
  showHeader(start);
  updateRail();
  map.show(start, false);
  tickClock();
  requestAnimationFrame(() => {
    scrollToIndex(start, false);
    lastVis = start;
    arrived = start;
    map.show(start, false);
    parkDot(start);
    placeArrows();
    armSlide(start);
    armHint();
    setTimeout(() => { map.bump(); }, 450);   // first-load zoom hint only; no flash
    setTimeout(nudge, NUDGE_FIRST);           // v10: first-load scroll pulse, after the map bump (450–1050ms)
  });

  setInterval(tickClock, 1000);
  setTimeout(function loop() { refresh(); setTimeout(loop, MIN - (now() % MIN)); }, MIN - (now() % MIN));
  function onInteract() { armHint(); }
  ["pointerdown", "touchstart", "wheel"].forEach(ev => {
    document.addEventListener(ev, onInteract, { passive: true });
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refresh(); tickClock(); armHint(); } });
  window.addEventListener("resize", () => {
    const i = visibleIndex();
    scrollToIndex(i, false);
    parkDot(arrived >= 0 ? arrived : i);
    placeArrows();
    armHint();
  });

  window.PUC_DEBUG = { now, items, currentIndex, scrollToIndex, map, titleLandingY, titleCenterY, cardH, syncDots, parkDot, armSlide, resetTracks, armHint, fireHint, clearHint, DOT_TRAVEL, HINT_IDLE, dots, timeline, SLIDE_DWELL, nudge, placeArrows };
})();
