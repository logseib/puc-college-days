/* =====================================================================
 * PUC College Days 2026 — schedule data
 * ---------------------------------------------------------------------
 * All times are PACIFIC wall-clock time ("YYYY-MM-DDTHH:MM", no zone).
 * The app compares them against the current time in America/Los_Angeles,
 * so the phone's own time zone never matters.
 *
 * To edit the schedule, only touch this file:
 *   - PLACES: every location used on a card (photo + map coordinates)
 *   - EVENTS: the timeline, in display order
 *
 * Event fields:
 *   id        unique slug
 *   start     Pacific start time (required)
 *   end       Pacific end time (optional; defaults to start + 60 min)
 *   title     big headline on the card
 *   place     key (or array of keys) into PLACES. First key = photo.
 *   where     optional custom location text (overrides place names)
 *   note      optional small line under the location
 *   audience  "all" (default) or "sponsors" — sponsors-only cards are
 *             shown but never chosen as the student's "current" event
 * ===================================================================== */

/* Illustrated campus map (assets/img/puc-campus-map.webp, 3145 x 2046 px,
 * rasterized at 400 dpi from PUC's official PDF campus map, page 1).
 * mapX / mapY / mapR = circle center + radius in that image's pixels,
 * read off the numbered labels on the illustration:
 *   #14 Church & Sanctuary, #18 Church Complex (Fireside Room, Scales Chapel).
 * Note: the illustration is rotated — north points LEFT, east points UP. */
window.PUC_MAP = {
  src: "assets/img/puc-campus-map.webp", w: 3145, h: 2046,
  // Permanent reference labels (dorms), shown on every map. x/y = dot on the building in map pixels; side = label above/below.
  // Spelling per the PDF legend + puc.edu: #39 "Grainger Hall", #44 "Graf Hall".
  // Girls/boys = TAA's room assignment for this trip (PUC's legend lists Grainger as men's, Graf as women's).
  labels: [
    { text: "Grainger (girls)", x: 1300, y: 812, side: "below" },   // #39 Grainger Hall (dot on its front facade)
    { text: "Graf (boys)",      x: 2085, y: 748, side: "below" }    // #44 Graf Hall
  ]
};

window.PUC_PLACES = {
  // Coordinates: PUC's official interactive campus map
  // (puc.edu/about-puc/campus-map, "View on map" data-location values),
  // cross-checked against OpenStreetMap/Nominatim where OSM has the building.
  church:     { name: "PUC Church",                 lat: 38.570234, lng: -122.441651, mapX: 1462, mapY: 1335, mapR: 120, img: "puc-church.jpg" },
  fireside:   { name: "Fireside Room",              sub: "Church Complex · #18 on the campus map", lat: 38.570615, lng: -122.440995, mapX: 1505, mapY: 1185, mapR: 85, img: "puc-fireside.jpg" },
  sabbath:    { name: "Sabbath School Rooms",       sub: "Church Complex", lat: 38.570117, lng: -122.441012, img: "puc-sabbath-school.jpg" },
  dining:     { name: "Dining Commons",             lat: 38.570553, lng: -122.440487, img: "puc-dining.jpg" },
  scales:     { name: "Scales Chapel",              sub: "Church Complex", lat: 38.570360, lng: -122.440852, img: "puc-scales.jpg" },
  newton:     { name: "Newton Chapel",              sub: "Newton Hall", lat: 38.571866, lng: -122.439473, img: "puc-newton.jpg" },
  gym:        { name: "PUC Gym (Pacific Auditorium)", lat: 38.568787, lng: -122.441264, img: "puc-gym.jpg" },
  paulin:     { name: "Paulin Recital Hall",        sub: "Paulin Hall", lat: 38.569513, lng: -122.441211, img: "puc-paulin.jpg" },
  utt:        { name: "Utt Center",                 sub: "New wing of Nelson Memorial Library", lat: 38.569530, lng: -122.440122, img: "puc-library-utt.jpg" },
  grainger:   { name: "Grainger Hall",              sub: "Girls", lat: 38.570972, lng: -122.439145, img: "puc-grainger.jpg" },
  graf:       { name: "Graf Hall",                  sub: "Boys",  lat: 38.568632, lng: -122.438866, img: "puc-graf.jpg" },
  mall:       { name: "Campus Mall",                lat: 38.569889, lng: -122.440449, img: "puc-campus-mall.jpg", radius: 120 },
  airport:    { name: "PUC Airport (Virgil O. Parrett Field)", lat: 38.572059, lng: -122.434216, img: "angwin-scenery.jpg", radius: 90 },
  elmshaven:  { name: "Elmshaven",                  sub: "Ellen G. White's home · 125 Glass Mountain Ln, St. Helena", lat: 38.537060, lng: -122.478762, img: "elmshaven.jpg" },
  sthelena:   { name: "Downtown St. Helena",        sub: "Main Street, St. Helena, CA", lat: 38.504575, lng: -122.469352, img: "sthelena.jpg", radius: 220 },
  free:       { name: "Your choice (on campus)", lat: 38.569889, lng: -122.440449, img: null, radius: 160 }  // img: null → gradient fallback card
};

window.PUC_EVENTS = [
  // ---------------- Sunday, Nov 15 (first three events only; Monday to be added later) ----------------
  // Check-in and breakfast overlap (both 9:00–10:00) and sit next door to each other, so they share one card.
  { id: "sun-checkin",   start: "2026-11-15T09:00", end: "2026-11-15T10:00", title: "Check-in + Breakfast with the Pastors", place: ["church", "fireside"], where: "Check-in: PUC Church · Breakfast: Fireside Room" },
  { id: "sun-worship",   start: "2026-11-15T10:00", end: "2026-11-15T10:30", title: "Worship",            place: "church" },
  { id: "sun-welcome",   start: "2026-11-15T10:30", end: "2026-11-15T11:00", title: "Welcome",            place: "church" }
];
