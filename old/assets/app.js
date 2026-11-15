/* =====================================================================
 * PUC College Days — app logic (no build step, no framework)
 *
 *  1. Time:   everything runs on PACIFIC wall-clock time. "Wall time" is
 *             stored as a number of ms where Date.UTC(y,m,d,h,min) == that
 *             Pacific clock reading, so plain number comparisons work.
 *             Demo override: ?now=2026-11-15T13:30 (Pacific); the clock
 *             keeps ticking forward from there.
 *  2. Render: one full-screen card per event (+ an intro card), built from
 *             window.PUC_EVENTS / window.PUC_PLACES (assets/events.js).
 *  3. Status: NOW / Up next / starts in N min / Done, refreshed each minute.
 *  4. Maps:   Leaflet + OSM tiles, created lazily when a card nears view,
 *             with all interaction disabled so it never fights the swipe.
 *             Tapping the map opens Apple Maps at that spot.
 * ===================================================================== */
(function () {
  "use strict";

  const TZ = "America/Los_Angeles";
  const EVENTS = window.PUC_EVENTS || [];
  const PLACES = window.PUC_PLACES || {};
  const IMG_DIR = "assets/img/";
  const MIN = 60 * 1000;

  /* ------------------------------------------------------------------ */
  /* 1. Time helpers                                                     */
  /* ------------------------------------------------------------------ */

  const partsFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  /** Real current Pacific wall time, in "wall ms". */
  function realPacificWall() {
    const p = {};
    partsFmt.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  }

  /** "2026-11-15T13:30" -> wall ms (interpreted as Pacific clock time). */
  function parseWall(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(s).trim());
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }

  // Demo override: shift "now" by a fixed offset so the clock still ticks.
  const params = new URLSearchParams(location.search);
  const override = params.has("now") ? parseWall(params.get("now")) : NaN;
  const offset = isNaN(override) ? 0 : override - realPacificWall();
  const now = () => realPacificWall() + offset;

  // Format wall ms using UTC getters (because wall ms *is* the Pacific reading).
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtTime(w, withSeconds) {
    const d = new Date(w);
    let h = d.getUTCHours(); const m = d.getUTCMinutes(); const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    let s = h + ":" + String(m).padStart(2, "0");
    if (withSeconds) s += ":" + String(d.getUTCSeconds()).padStart(2, "0");
    return s + " " + ap;
  }
  function fmtDay(w) { const d = new Date(w); return DAYS[d.getUTCDay()] + " · " + MONTHS[d.getUTCMonth()] + " " + d.getUTCDate(); }
  function fmtDuration(ms) {
    const mins = Math.max(1, Math.round(ms / MIN));
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h >= 24) { const days = Math.round(h / 24); return days + (days === 1 ? " day" : " days"); }
    return h + " hr" + (m ? " " + m + " min" : "");
  }

  /** Accent color for a card: yellow in the morning → blue in the evening. */
  function accentFor(w) {
    const d = new Date(w);
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
    const t = Math.min(1, Math.max(0, (hour - 9) / (21 - 9)));   // 9 AM = yellow, 9 PM = blue
    // HSL hue 48 (amber) → 220 (blue); keep it dark enough for white text.
    const hue = 48 + t * (220 - 48);
    const light = 42 - Math.sin(t * Math.PI) * 8;   // dip mid-day so the green phase stays legible
    return "hsl(" + hue.toFixed(0) + " 85% " + light.toFixed(0) + "%)";
  }

  /* ------------------------------------------------------------------ */
  /* 2. Build the data model                                             */
  /* ------------------------------------------------------------------ */

  const items = EVENTS.map((e, i) => {
    const start = parseWall(e.start);
    const end = e.end ? parseWall(e.end) : start + 60 * MIN;
    const keys = [].concat(e.place || []);
    const places = keys.map(k => PLACES[k]).filter(Boolean);
    return Object.assign({}, e, { index: i, startW: start, endW: end, places, sponsors: e.audience === "sponsors" });
  });

  /* ------------------------------------------------------------------ */
  /* 3. Render cards                                                     */
  /* ------------------------------------------------------------------ */

  const timeline = document.getElementById("timeline");
  const rail = document.getElementById("rail");

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Intro card (scroll up from the first event to see it)
  const intro = el("section", "card card-intro");
  intro.innerHTML =
    '<div class="card-day">Thunderbird Adventist Academy</div>' +
    "<h1>PUC College Days</h1>" +
    "<p>Pacific Union College · Angwin, CA<br>Nov 14–16, 2026</p>" +
    "<p>Every card is one stop. The red <b>NOW</b> badge is where you should be. Times are Pacific.</p>" +
    '<p class="hint">Swipe up for the schedule ↓</p>';
  timeline.appendChild(intro);

  items.forEach((it, i) => {
    const card = el("section", "card");
    card.id = "e-" + it.id;
    card.dataset.index = i;
    card.style.setProperty("--accent", accentFor(it.startW));

    const main = it.places[0] || {};
    const whereText = it.where || it.places.map(p => p.name).join(" + ") || "TBA";
    const sub = it.note || (it.places.length === 1 ? main.sub : "") || "";
    const timeText = fmtTime(it.startW) + (it.end ? " – " + fmtTime(it.endW) : "");

    card.innerHTML =
      '<div class="card-day">' + esc(fmtDay(it.startW)) + "</div>" +
      '<div class="card-head"><span class="card-time">' + esc(timeText) + '</span><span class="badge"></span></div>' +
      '<h2 class="card-title">' + esc(it.title) + "</h2>" +
      '<p class="card-where"><span class="pin">●</span> ' + esc(whereText) + "</p>" +
      (sub ? '<p class="card-sub">' + esc(sub) + "</p>" : "") +
      '<div class="card-photo"></div>' +
      '<div class="card-map"><div class="map-canvas"></div></div>';

    // Photo (or a gradient fallback when we have none)
    const photo = card.querySelector(".card-photo");
    if (main.img) {
      const img = new Image();
      img.alt = main.name || it.title;
      img.loading = i < 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.src = IMG_DIR + main.img;
      img.onerror = () => { img.remove(); photo.appendChild(el("div", "fallback-label", esc(whereText))); };
      photo.appendChild(img);
    } else {
      photo.appendChild(el("div", "fallback-label", esc(whereText)));
    }

    // Map tap target → Apple Maps (falls back to Google Maps in non-Apple browsers automatically)
    if (main.lat) {
      const a = el("a", "map-link", "<span>Open in Maps ↗</span>");
      a.href = "https://maps.apple.com/?ll=" + main.lat + "," + main.lng + "&q=" + encodeURIComponent(main.name || it.title) + "&z=18";
      a.target = "_blank"; a.rel = "noopener";
      card.querySelector(".card-map").appendChild(a);
    }

    timeline.appendChild(card);
    it.card = card;
    rail.appendChild(document.createElement("i"));
  });

  /* ------------------------------------------------------------------ */
  /* 4. Lazy Leaflet mini maps                                           */
  /* ------------------------------------------------------------------ */

  function initMap(it) {
    if (it.map || !window.L || !it.places.length) return;
    const node = it.card.querySelector(".map-canvas");
    node.style.width = "100%"; node.style.height = "100%";
    const map = L.map(node, {
      zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false,
      attributionControl: true, zoomSnap: 1   // integer zooms avoid tile seams
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© OpenStreetMap"
    }).addTo(map);

    const circles = it.places.map(p => L.circle([p.lat, p.lng], {
      radius: p.radius || 22, color: "#ff2a2a", weight: 3, fillColor: "#ff2a2a", fillOpacity: 0.28
    }).addTo(map));

    if (circles.length === 1) {
      const p = it.places[0];
      map.setView([p.lat, p.lng], p.radius > 150 ? 15 : p.radius > 60 ? 16 : 18);
    } else {
      // Fit all places (bounds from raw points: circle.getBounds() needs a map view first)
      map.fitBounds(L.latLngBounds(it.places.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 18 });
    }
    it.map = map;
  }

  // Create maps only for cards near the viewport (keeps 30 Leaflet maps cheap)
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const it = items[+en.target.dataset.index];
      if (it) initMap(it);
    });
  }, { root: timeline, rootMargin: "100% 0px 100% 0px" });
  items.forEach(it => io.observe(it.card));

  /* ------------------------------------------------------------------ */
  /* 5. Status: which card is live, badges, rail                          */
  /* ------------------------------------------------------------------ */

  /** Index of the student's "current" card: live event (latest start wins), else next upcoming. */
  function currentIndex(t) {
    let live = -1;
    items.forEach((it, i) => { if (!it.sponsors && it.startW <= t && t < it.endW) live = i; });
    if (live >= 0) return { index: live, live: true };
    const next = items.findIndex(it => !it.sponsors && it.startW > t);
    return { index: next >= 0 ? next : items.length - 1, live: false };
  }

  let cur = { index: 0, live: false };
  function refreshStatus() {
    const t = now();
    cur = currentIndex(t);
    items.forEach((it, i) => {
      const badge = it.card.querySelector(".badge");
      let cls = "badge", text;
      const isLive = it.startW <= t && t < it.endW;
      if (isLive) { cls += " badge-now"; text = "NOW · " + fmtDuration(it.endW - t) + " left"; }
      else if (t >= it.endW) { cls += " badge-done"; text = "Done"; }
      else if (i === cur.index && !cur.live) { cls += " badge-next"; text = "Up next · " + fmtDuration(it.startW - t); }
      else if (it.startW - t <= 90 * MIN) { cls += " badge-soon"; text = "starts in " + fmtDuration(it.startW - t); }
      else { cls += " badge-soon"; text = "in " + fmtDuration(it.startW - t); }
      if (it.sponsors && t < it.endW) { cls = "badge badge-sponsor"; text = isLive ? "Sponsors · NOW" : "Sponsors only"; }
      badge.className = cls; badge.textContent = text;
      it.card.classList.toggle("is-done", t >= it.endW);
      it.card.classList.toggle("is-live", isLive);
      const tick = rail.children[i];
      tick.classList.toggle("done", t >= it.endW);
      tick.classList.toggle("live", i === cur.index);
    });
    updateHere();
  }

  /* ------------------------------------------------------------------ */
  /* 6. Clock, scrolling, "Jump to now"                                   */
  /* ------------------------------------------------------------------ */

  const clockEl = document.getElementById("clock");
  function tickClock() { clockEl.textContent = fmtTime(now(), true); }

  const nowBtn = document.getElementById("now-btn");
  function visibleIndex() {
    // card index under the middle of the screen (intro = -1)
    return Math.round(timeline.scrollTop / timeline.clientHeight) - 1;
  }
  const peek = document.getElementById("peek");
  function updateHere() {
    const v = visibleIndex();
    // Fixed "up next" line inside the blurred bottom edge
    const next = items[v + 1];
    peek.textContent = next ? "↓ " + fmtTime(next.startW) + " · " + next.title + (next.sponsors ? " (sponsors)" : "") : "End of the trip · safe travels!";
    [...rail.children].forEach((n, i) => n.classList.toggle("here", i === v));
    nowBtn.hidden = v === cur.index;
    nowBtn.textContent = cur.live ? "Jump to now" : "Jump to next";
  }
  function scrollToIndex(i, smooth) {
    const target = items[i] && items[i].card;
    if (!target) return;
    timeline.scrollTo({ top: target.offsetTop, behavior: smooth ? "smooth" : "instant" });
  }
  nowBtn.addEventListener("click", () => scrollToIndex(cur.index, true));
  let scrollRaf = 0;
  timeline.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(updateHere);
  }, { passive: true });

  // Demo banner
  if (offset) {
    const b = document.getElementById("demo-banner");
    b.hidden = false;
    document.body.classList.add("is-demo");
    b.textContent = "DEMO TIME · " + fmtDay(override).split(" · ")[0] + " " + fmtTime(override);
  }

  // Boot: start at the live (or next) event. Before the trip that's the first event.
  refreshStatus();
  tickClock();
  scrollToIndex(cur.index, false);
  initMap(items[cur.index]);
  updateHere();

  setInterval(tickClock, 1000);
  // Refresh badges at the top of every minute
  setTimeout(function loop() { refreshStatus(); setTimeout(loop, MIN - (now() % MIN)); }, MIN - (now() % MIN));
  // Re-sync when the phone wakes the page back up
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { refreshStatus(); tickClock(); } });
  // Keep the same card in place when the viewport size changes (rotation, toolbar)
  window.addEventListener("resize", () => { const v = visibleIndex(); if (v >= 0) scrollToIndex(v, false); });

  // Expose a tiny debug hook for Naoto / testing
  window.PUC_DEBUG = { now, items, currentIndex, scrollToIndex };
})();
