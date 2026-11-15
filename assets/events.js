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

window.PUC_PLACES = {
  // Coordinates: PUC's official interactive campus map
  // (puc.edu/about-puc/campus-map, "View on map" data-location values),
  // cross-checked against OpenStreetMap/Nominatim where OSM has the building.
  church:     { name: "PUC Church",                 lat: 38.570234, lng: -122.441651, img: "puc-church.jpg" },
  fireside:   { name: "Fireside Room",              sub: "Church Complex · #18 on the campus map", lat: 38.570615, lng: -122.440995, img: "puc-fireside.jpg" },
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
  // ---------------- Saturday, Nov 14 (Sabbath) ----------------
  { id: "sat-breakfast", start: "2026-11-14T08:30", end: "2026-11-14T10:00", title: "Breakfast",          place: "fireside" },
  { id: "sat-ss",        start: "2026-11-14T10:00", end: "2026-11-14T11:00", title: "Sabbath School",     place: "sabbath", where: "Various locations" },
  { id: "sat-church",    start: "2026-11-14T11:15", end: "2026-11-14T12:30", title: "Church",             place: "church" },
  { id: "sat-lunch",     start: "2026-11-14T12:30", end: "2026-11-14T14:00", title: "Lunch",              place: "dining" },
  { id: "sat-elmshaven", start: "2026-11-14T13:30", end: "2026-11-14T15:00", title: "TAA Group Visit to Elmshaven", place: "elmshaven", note: "Off campus · ride in your assigned vehicle" },
  { id: "sat-hike",      start: "2026-11-14T15:00", end: "2026-11-14T16:30", title: "Back 40 Hike",       place: "airport", note: "With the School of Sciences · wear hiking shoes" },
  { id: "sat-dinner",    start: "2026-11-14T16:30", end: "2026-11-14T18:00", title: "Dinner",             place: "dining" },
  { id: "sat-worship",   start: "2026-11-14T18:30", end: "2026-11-14T19:30", title: "Worship & Activities", place: "scales" },
  { id: "sat-games",     start: "2026-11-14T20:00", end: "2026-11-14T22:00", title: "Game Night",         place: "newton" },
  { id: "sat-dorms",     start: "2026-11-14T22:30", end: "2026-11-14T23:30", title: "Back to Dorms",      place: ["grainger", "graf"], where: "Girls → Grainger Hall · Boys → Graf Hall" },

  // ---------------- Sunday, Nov 15 ----------------
  // Check-in and breakfast overlap (both 9:00–10:00) and sit next door to each other, so they share one card.
  { id: "sun-checkin",   start: "2026-11-15T09:00", end: "2026-11-15T10:00", title: "Check-in + Breakfast with the Pastors", place: ["church", "fireside"], where: "Check-in: PUC Church · Breakfast: Fireside Room" },
  { id: "sun-worship",   start: "2026-11-15T10:00", end: "2026-11-15T10:30", title: "Worship",            place: "church" },
  { id: "sun-welcome",   start: "2026-11-15T10:30", end: "2026-11-15T11:00", title: "Welcome",            place: "church" },
  { id: "sun-fair",      start: "2026-11-15T11:00", end: "2026-11-15T12:00", title: "Academic & Service Fair", place: "fireside" },
  { id: "sun-brunch",    start: "2026-11-15T12:00", end: "2026-11-15T13:00", title: "Brunch",             place: "dining" },
  { id: "sun-race",      start: "2026-11-15T13:15", end: "2026-11-15T14:45", title: "Amazing Race",       place: "church", note: "Starts at the church" },
  { id: "sun-sthelena",  start: "2026-11-15T15:00", end: "2026-11-15T17:00", title: "St. Helena Trip",    place: "sthelena", note: "Off campus · ride in your assigned vehicle" },
  { id: "sun-festival",  start: "2026-11-15T17:00", end: "2026-11-15T19:00", title: "Fall Festival",      place: "gym" },
  { id: "sun-free",      start: "2026-11-15T19:00", end: "2026-11-15T20:00", title: "Free Time",          place: "free" },
  { id: "sun-dessert",   start: "2026-11-15T20:00", end: "2026-11-15T21:00", title: "Late Night Dessert Bar", place: "fireside" },
  { id: "sun-dorms",     start: "2026-11-15T22:00", end: "2026-11-15T23:00", title: "Back to Dorms",      place: ["grainger", "graf"], where: "Girls → Grainger Hall · Boys → Graf Hall" },

  // ---------------- Monday, Nov 16 ----------------
  { id: "mon-breakfast", start: "2026-11-16T07:30", end: "2026-11-16T08:30", title: "Breakfast",          place: "dining", note: "Wear your professional clothes for class today" },
  { id: "mon-walk",      start: "2026-11-16T08:50", end: "2026-11-16T09:00", title: "Walk to Classes",    place: "mall" },
  { id: "mon-session1",  start: "2026-11-16T09:00", end: "2026-11-16T09:50", title: "Academic Session I", place: "mall", where: "Various departments" },
  { id: "mon-forum",     start: "2026-11-16T09:00", end: "2026-11-16T10:00", title: "Leadership Forum",   place: "utt", audience: "sponsors", note: "Sponsors & parents only" },
  { id: "mon-session2",  start: "2026-11-16T10:00", end: "2026-11-16T10:50", title: "Academic Session II", place: "mall", where: "Various departments" },
  { id: "mon-closing",   start: "2026-11-16T11:00", end: "2026-11-16T11:30", title: "Closing Session",    place: "paulin" },
  { id: "mon-lunch",     start: "2026-11-16T11:30", end: "2026-11-16T12:30", title: "Lunch",              place: "dining" },
  { id: "mon-depart",    start: "2026-11-16T13:00", end: "2026-11-16T13:30", title: "Depart Campus",      place: "mall", note: "Have your bags packed" }
];
