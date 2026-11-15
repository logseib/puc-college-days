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
 *   place     key (or array of keys) into PLACES. First key = photo
 *             (and the map still frames every key).
 *   photo     optional place key whose image to show (overrides first key)
 *   where     optional custom location text (overrides place names)
 *   note      optional small line under the location
 *   audience  "all" (default) or "sponsors" — sponsors-only cards are
 *             shown but never chosen as the student's "current" event
 * ===================================================================== */

/* Illustrated campus map (assets/img/puc-campus-map-v5.webp, 3145 x 2046 px,
 * rasterized at 400 dpi from PUC's official PDF campus map, page 1, with
 * dorm tags baked into the image so they scale with pinch-zoom:
 *   "Grainger (girls)" orange #f07a1a on #39, "Graf (boys)" blue #2f6fe0 on #44.
 * Spelling / gender = TAA's room assignment for this trip (PUC's legend lists
 * Grainger as men's, Graf as women's). The untagged original is kept as
 * assets/img/puc-campus-map.webp.
 * mapX / mapY / mapR = circle center + radius in that image's pixels,
 * read off the numbered labels on the illustration:
 *   #14 Church & Sanctuary, #18 Church Complex (Fireside Room, Scales Chapel),
 *   #20 Pacific Auditorium (gym), #26 Dining Commons,
 *   #39 Grainger Hall, #44 Graf Hall.
 * Off-campus or unsited places (St. Helena, Free Time) have no mapX — the
 * map then shows the full campus and draws no red circle.
 * Note: the illustration is rotated — north points LEFT, east points UP. */
window.PUC_MAP = {
  src: "assets/img/puc-campus-map-v5.webp", w: 3145, h: 2046
};

window.PUC_PLACES = {
  // Coordinates: PUC's official interactive campus map
  // (puc.edu/about-puc/campus-map, "View on map" data-location values),
  // cross-checked against OpenStreetMap/Nominatim where OSM has the building.
  // Pixel coords were read off the numbered badges on the illustrated map.
  church:     { name: "PUC Church",                 lat: 38.570234, lng: -122.441651, mapX: 1462, mapY: 1335, mapR: 120, img: "puc-church.jpg", interior: "puc-church-interior.webp" },
  fireside:   { name: "Fireside Room (Church complex)", lat: 38.570615, lng: -122.440995, mapX: 1505, mapY: 1185, mapR: 85, img: "puc-fireside.jpg" },
  sabbath:    { name: "Sabbath School Rooms",       sub: "Church Complex", lat: 38.570117, lng: -122.441012, img: "puc-sabbath-school.jpg" },
  dining:     { name: "Dining Commons",             lat: 38.570553, lng: -122.440487, mapX: 1472, mapY: 1058, mapR: 95, img: "puc-dining.jpg" },
  scales:     { name: "Scales Chapel",              sub: "Church Complex", lat: 38.570360, lng: -122.440852, img: "puc-scales.jpg" },
  newton:     { name: "Newton Chapel",              sub: "Newton Hall", lat: 38.571866, lng: -122.439473, img: "puc-newton.jpg" },
  gym:        { name: "PUC Gym (Pacific Auditorium)", lat: 38.568787, lng: -122.441264, mapX: 1980, mapY: 1242, mapR: 140, img: "puc-gym.jpg" },
  paulin:     { name: "Paulin Recital Hall",        sub: "Paulin Hall", lat: 38.569513, lng: -122.441211, img: "puc-paulin.jpg" },
  utt:        { name: "Utt Center",                 sub: "New wing of Nelson Memorial Library", lat: 38.569530, lng: -122.440122, img: "puc-library-utt.jpg" },
  grainger:   { name: "Grainger Hall",              sub: "Girls", lat: 38.570972, lng: -122.439145, mapX: 1348, mapY: 765, mapR: 120, img: "puc-grainger.jpg" },
  graf:       { name: "Graf Hall",                  sub: "Boys",  lat: 38.568632, lng: -122.438866, mapX: 1988, mapY: 710, mapR: 110, img: "puc-graf.jpg" },
  mall:       { name: "Campus Mall",                lat: 38.569889, lng: -122.440449, img: "puc-campus-mall.jpg", radius: 120 },
  airport:    { name: "PUC Airport (Virgil O. Parrett Field)", lat: 38.572059, lng: -122.434216, img: "angwin-scenery.jpg", radius: 90 },
  elmshaven:  { name: "Elmshaven",                  sub: "Ellen G. White's home · 125 Glass Mountain Ln, St. Helena", lat: 38.537060, lng: -122.478762, img: "elmshaven.jpg" },
  sthelena:   { name: "Downtown St. Helena",        sub: "Main Street, St. Helena, CA", lat: 38.504575, lng: -122.469352, img: "sthelena.jpg", radius: 220 },
  free:       { name: "Your choice (on campus)", lat: 38.569889, lng: -122.440449, img: null, radius: 160 }  // img: null → no photo; no mapX → full-campus map, no circle
};

window.PUC_EVENTS = [
  // ---------------- Sunday, Nov 15 (full day) ----------------
  // Breakfast only at Fireside (#18). Check-in was dropped from this card.
  { id: "sun-breakfast", start: "2026-11-15T09:00", end: "2026-11-15T10:00", title: "Breakfast with the Pastors", place: "fireside" },
  { id: "sun-worship",   start: "2026-11-15T10:00", end: "2026-11-15T10:30", title: "Worship",            place: "church" },
  { id: "sun-welcome",   start: "2026-11-15T10:30", end: "2026-11-15T11:00", title: "Welcome",            place: "church" },
  { id: "sun-fair",      start: "2026-11-15T11:00", end: "2026-11-15T12:00", title: "Academic & Service Fair", place: "fireside" },
  { id: "sun-brunch",    start: "2026-11-15T12:00", end: "2026-11-15T13:00", title: "Brunch",             place: "dining" },
  { id: "sun-race",      start: "2026-11-15T13:15", end: "2026-11-15T14:45", title: "Amazing Race",       place: "church", note: "Starts at the church" },
  { id: "sun-sthelena",  start: "2026-11-15T15:00", end: "2026-11-15T17:00", title: "St. Helena Trip",    place: "sthelena", note: "Off campus · ride in your assigned vehicle" },
  { id: "sun-festival",  start: "2026-11-15T17:00", end: "2026-11-15T19:00", title: "Fall Festival",      place: "gym" },
  { id: "sun-free",      start: "2026-11-15T19:00", end: "2026-11-15T20:00", title: "Free Time",          place: "free" },
  { id: "sun-dessert",   start: "2026-11-15T20:00", end: "2026-11-15T21:00", title: "Late Night Dessert Bar", place: "fireside" },
  { id: "sun-dorms",     start: "2026-11-15T22:00", end: "2026-11-15T23:00", title: "Back to Dorms",      place: ["grainger", "graf"], where: "Grainger (girls) / Graf (boys)" }
];
