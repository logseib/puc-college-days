# PUC College Days — live student timeline (v2 · Sunday)

**v2 (Nov 14, 2026):** Sunday Nov 15 only, first three events (Check-in + Breakfast, Worship, Welcome). Light gray, minimal; date + time range are a fixed header that cross-fades between events; thin progress rail on the left; tiny HH:MM clock. Map = PUC's illustrated PDF campus map (`assets/img/puc-campus-map.webp`), multiply-blended, blurred/feathered rim, pinch to zoom (after a pinch, one finger pans; double-tap resets), red circle per place (pixel coords `mapX/mapY/mapR` in `assets/events.js`; the illustration is rotated: north = left). No Leaflet/OSM, no rounded corners. The previous version is kept untouched in `old/` (open `old/index.html`).

**v4 (Nov 15, 2026):** one fixed map in the bottom third (glides ~500 ms to each event, circles cross-fade, rim ~35% wider); snap cards sized to the space above it; left rail = fixed fading hairline + a per-card bullet dot at the title (red when live) that fades in as the card lands.

**v5 (Nov 15, 2026):** dorm tags are baked into the map image (`assets/img/puc-campus-map-v5.webp`) so they scale with pinch-zoom like the buildings. "Grainger (girls)" is a solid orange (#f07a1a) rectangle on #39; "Graf (boys)" is a solid blue (#2f6fe0) rectangle on #44; white sans text, square corners. The untagged original map is kept as `assets/img/puc-campus-map.webp`. The old HTML text-label overlays are gone. Backups: `old/v2-labels/`, `old/v3/`, `old/v4/`.

**v6 (Nov 15, 2026):** header is only the date ("Sunday, November 15") and a live HH:MMAM clock. Each card's title is one line, "9:00AM : Event name" (time in the previous title weight, name lighter). Photos crop to 3:2 at the same width. The map is ~47% of the viewport and stays pinned, as a dreamy edgeless window (all sides dissolve into #d2d2d2, with a taller top fade and a backdrop-blur seam so scrolling cards melt into the map with no hard line). After a swipe settles it does the existing zoom bump plus a brief, very subtle flash. The incoming rail dot fades in from 70px below its landing and glides up to the new title; the outgoing dot rides its title out. Check-in + Breakfast shows the Fireside Room photo (that's where the hour is spent); the map still circles both the church and Fireside. Backups: `old/v2-labels/`, `old/v3/`, `old/v4/`, `old/v5/`.

**v7 (Nov 15, 2026):** map edge treatment returns to v5's feathered rim (multiply blend, 5px backdrop-filter blur, inset paper fade), with only the top fade made ~1.5× taller (~57px vs v5's ~38px). The v6 dreamy all-edge vignette, backdrop-blur seam, and map-paper layer are gone. Cards are once again sized to the space above the map, so they don't tuck under it. Rail dots use a scroll-linked parallax: each bullet travels only ~70px along the line while the card travels a full screen, with opacity going 0→1 as the incoming dot rises from 70px below the title, and 1→0 as the outgoing dot moves up ~70px. Visible labels use a space on both sides of a colon (`Location : PUC Church`, `10:00AM : Worship`), except inside clock times (`10:00`). Backups: `old/v2-labels/`, `old/v3/`, `old/v4/`, `old/v5/`, `old/v6/`.

**v8 (Nov 15, 2026):** full Sunday schedule (11 events). The 9:00 AM card is Breakfast with the Pastors at the Fireside Room only (no check-in, map circles #18 only). New map coords: Dining Commons #26, Pacific Auditorium / gym #20, Grainger #39, Graf #44. Off-campus St. Helena and unsited Free Time show the full campus with no red circle. The live event no longer has a red outline or a "CURRENT EVENT" tab; a compact square "RIGHT NOW" tag sits at the end of the title's first line, and the rail dot stays red. Location text is 15px (2px larger than v7). Church exteriors crop to `object-position: center 85%` so the lawn sign stays in the 3:2 frame. Church cards slide to Logan's sanctuary interior after a 5s dwell (alternating, 600ms ease; reduced-motion crossfades). After 10s idle a "SWIPE UP" hint (same type as "PINCH TO ZOOM") pulses just above the map; any interaction resets the timer; it is hidden on the last event and delayed slightly so it doesn't overlap a photo slide. Backups: `old/v2-labels/` through `old/v7/`.

**v10 (Nov 15, 2026):** page title / Home Screen name is **Attendancemaxing** (manifest name + short_name, apple-mobile-web-app-title). New icons (`assets/icons/`): the little gabled house from the campus map (next to #22, badge painted out) inside a site-style red circle, on the map's multiply-gray; apple-touch-icon 180, 192, 512, 512 maskable, favicon-32 + favicon.ico. Link preview for iMessage/WhatsApp: `assets/img/og-attendancemaxing.jpg` (1200×630, the map centered on the church with its red circle and a red "ATTENDANCEMAXING" tag in the RIGHT NOW style) with og:/twitter: tags. "Add to Home Screen" tip + plus button (`assets/a2hs.js`) ported from Who's On Duty (itself from the Card Tracker site), with the same rules: hidden when opened from the Home Screen; on phones it opens by itself 800ms after load until closed once (localStorage `attendancemaxingA2HS`); iOS gets the three Safari steps, other phones a one-liner; desktop gets a bookmark button and never auto-opens. Restyled in paper gray, mono, square corners, red top hairline; the plus sits in the map's soft top-right corner. Also: a faint wide down chevron centered under each photo (bobs ~5px over 2.4s; none on the last event; no bob with reduced motion); a scroll pulse (the snapped card's content and its dot nudge up 24px and back over 650ms) 1.2s after load and with every 10s-idle SWIPE UP hint; rail ticks for upcoming events, spaced at the dot's 70px parallax travel, riding up with the incoming dot and cross-fading into it. CSS/JS cache-bust `?v=11`. Backup: `old/v9/`.

**v11 (Nov 15, 2026):** the v10 rail ticks are gone (DOM, CSS, JS); the parallax dot is back to exactly v9's behavior. All icons are now a red label on pure white, in the RIGHT NOW / og-tag style (site red, square corners, white bold mono uppercase, .08em tracking) reading "PUC / ATTENDANCE- / MAXING"; the maskable one keeps the label inside the 80% safe zone; the favicons (32 + .ico 16/32/48) are a simplified "PUC" label. Same files as v10. Cache-bust `?v=12` (CSS, JS, icons, manifest). Backup: `old/v10/`.

**v12 (Nov 15, 2026):** the bobbing down arrow under each photo is gone (DOM, CSS, JS); the scroll pulse, SWIPE UP hint and parallax dot are unchanged. New icon in the style of Logan's Card Tracker / Who's On Duty icon SVGs: light vertical-gradient background, the red label tilted 7°, a darker red copy offset below it for a 3D edge, soft drop shadow, diagonal fill gradient, top highlight, inner white hairline and lightly embossed text; "PUC" is much larger above "ATTENDANCE- / MAXING". Sources: `assets/icons/icon.svg`, `icon-maskable.svg` (scaled into the 80% safe zone), `favicon.svg` ("PUC" only). Text is IBM Plex Mono Bold (the PNGs are pre-rendered, so the device font doesn't matter). Cache-bust `?v=13`. Backup: `old/v11/`.

The notes below describe v1 and are kept for reference.


---


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
