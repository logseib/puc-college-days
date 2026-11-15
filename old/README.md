# PUC College Days — live student timeline (DEMO)

Single-page, phone-first schedule for TAA students at PUC College Days (Pacific Union College, Angwin CA, Nov 14–16, 2026).
Plain HTML/CSS/JS, **no build step**. GitHub Pages–ready: push this folder and serve from the repo root.

## Files
```
index.html            page shell, meta tags for Add to Home Screen
manifest.json         PWA manifest
assets/events.js      ← THE SCHEDULE (places + events). Edit this to change times/locations.
assets/app.js         clock, status badges, snapping timeline, lazy Leaflet maps
assets/styles.css     dark theme, snap scrolling, blurred edges, safe areas
assets/img/           location photos + CREDITS.md (sources/licenses)
assets/icons/         home-screen icons
previews/             iPhone 14 screenshots at simulated times
tools/preview.py      Playwright script that makes the previews
```

## How it works
- **Time:** everything is Pacific (`America/Los_Angeles` via `Intl`) no matter what zone the phone is in.
- **Start position:** on load it jumps to the live event, or the next upcoming one (before the trip that's the first event). Scroll up/down freely; a "Jump to now" button appears when you wander off.
- **Controlled scrolling:** `scroll-snap-type: y mandatory` + `scroll-snap-stop: always` with one `100dvh` card per event, so one swipe = one event.
- **Overlaps:** "current" = live event with the latest start (e.g. Sat 1:45 PM → Elmshaven, not lunch). Sponsors-only cards (`audience: "sponsors"`) are shown but never chosen as current.
- **Maps:** Leaflet + OpenStreetMap tiles, red `L.circle` per place, all interaction disabled; tapping opens Apple Maps.
- **Badges** refresh at the top of every minute; the header clock ticks every second.

## Demo / testing
Add `?now=YYYY-MM-DDTHH:MM` (Pacific), e.g. `index.html?now=2026-11-15T13:30`. The clock keeps ticking from that time and a yellow DEMO TIME tag appears.

Local preview:
```
python3 -m http.server 8765
python3 tools/preview.py          # writes previews/*.png (needs playwright + chrome)
```

## Coordinates
From PUC's official interactive campus map (`data-location` values on https://www.puc.edu/about-puc/campus-map), cross-checked against OpenStreetMap/Nominatim (within ~10–25 m for Church, Paulin, Pacific Auditorium, Graf). Elmshaven and downtown St. Helena (1309 Main St) from Nominatim.

## Notes for handoff
- Newton Chapel is mapped to Newton Hall; Utt Center to the library (it's the library's new wing). Confirm with PUC.
- 3:00 PM Back 40 Hike and the 10:30 / 10:00 PM "Back to dorms" cards have no end time in the source schedule; end times in events.js are placeholders.
- Fully static; Leaflet and map tiles load from CDNs, so the maps need a data connection.
