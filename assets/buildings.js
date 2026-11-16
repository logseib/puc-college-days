/* =====================================================================
 * PUC campus building index for the Academic Session map search (v26).
 *
 * Source: official PUC Campus Map key (PDF, 10/2024), numbers 1–36,
 * 38–49, 51–58, 60–61 (58 named buildings). #37, #50, and #59 appear
 * on the illustration but are not in the official key — they are
 * omitted so we do not invent names. Campus Mall is unnumbered and
 * included as a searchable extra using the existing itinerary coords.
 *
 * Coordinates: nine itinerary places reuse the existing mapX/mapY/mapR
 * already used on event cards (church, fireside/Church Complex, dining,
 * gym, Paulin, Utt, Grainger, Graf, mall). The rest were read from the
 * numbered badges on assets/img/puc-campus-map-v5.webp (3145×2046;
 * north points LEFT) and checked on a contact sheet.
 * ===================================================================== */
(function () {
  "use strict";

  var buildings = [
    { n: 1, name: "Angwin Plaza", mapX: 1102, mapY: 1932, mapR: 150, aliases: ["Ace Hardware", "Market", "Washette", "Plaza", "hardware", "laundry"] },
    { n: 2, name: "Post Office", mapX: 1313, mapY: 1929, mapR: 80, aliases: ["PO", "mail"] },
    { n: 3, name: "Student Wellness Center", mapX: 525, mapY: 1743, mapR: 95, aliases: ["Wellness", "Wellness Center", "Counseling", "Counseling Services", "Health Services", "health center"] },
    { n: 4, name: "Dental Building", mapX: 656, mapY: 1753, mapR: 80, aliases: ["Dental", "Dentist"] },
    { n: 5, name: "Credit Union", mapX: 1298, mapY: 1819, mapR: 80, aliases: ["CU"] },
    { n: 6, name: "Tennis Courts", mapX: 2441, mapY: 1745, mapR: 110, aliases: ["Tennis"] },
    { n: 7, name: "Athletic Field", mapX: 2731, mapY: 1751, mapR: 150, aliases: ["Hardball", "Softball", "Sand Volleyball", "volleyball", "athletic fields"] },
    { n: 8, name: "Brookside Park", mapX: 175, mapY: 1673, mapR: 150, aliases: ["Brookside", "Student Family Housing"] },
    { n: 9, name: "College Chevron", mapX: 374, mapY: 1507, mapR: 80, aliases: ["Chevron", "gas station"] },
    { n: 10, name: "Athletic Track & Field", mapX: 2393, mapY: 1435, mapR: 150, aliases: ["Track", "Track and Field", "athletic track"] },
    { n: 11, name: "Press Building", mapX: 658, mapY: 1365, mapR: 95, aliases: ["Press", "Copy Center", "Mail Services"] },
    { n: 12, name: "Custodial", mapX: 1076, mapY: 1392, mapR: 95, aliases: ["Lost and Found", "lost & found"] },
    { n: 13, name: "Heating Plant", mapX: 1212, mapY: 1318, mapR: 80, aliases: ["Heating"] },
    { n: 14, name: "Church & Sanctuary", mapX: 1462, mapY: 1335, mapR: 120, aliases: ["Church", "Sanctuary", "PUC Church", "church sanctuary"] },
    { n: 15, name: "Alumni Park", mapX: 400, mapY: 1239, mapR: 80, aliases: ["Alumni"] },
    { n: 16, name: "Fisher Hall", mapX: 1095, mapY: 1229, mapR: 95, aliases: ["Fisher", "Visual Arts", "art"] },
    { n: 17, name: "Sabbath School Rooms", mapX: 1431, mapY: 1213, mapR: 95, aliases: ["Sabbath School", "Sabbath School Rooms"] },
    { n: 18, name: "Church Complex", mapX: 1505, mapY: 1185, mapR: 85, aliases: ["Fireside", "Fireside Room", "Scales Chapel", "Scales", "Campus Chaplain", "Campus Ministries", "Church Office", "Theology", "Church Complex"] },
    { n: 19, name: "Paulin Hall", mapX: 1725, mapY: 1232, mapR: 100, aliases: ["Paulin", "Paulin Recital Hall", "Music"] },
    { n: 20, name: "Pacific Auditorium", mapX: 1980, mapY: 1242, mapR: 140, aliases: ["Gym", "Gymnasium", "Auditorium", "Pacific Auditorium", "Fitness Center", "Kinesiology", "Weight Room", "fitness"] },
    { n: 21, name: "Swimming Pool", mapX: 2107, mapY: 1222, mapR: 80, aliases: ["Pool"] },
    { n: 22, name: "Public Safety", mapX: 529, mapY: 976, mapR: 80, aliases: ["Security", "campus safety"] },
    { n: 23, name: "Chan Shun Hall", mapX: 812, mapY: 1010, mapR: 110, aliases: ["Chan Shun", "Academic Administration", "Academic Advising", "Chemistry", "Mathematics", "Math", "Physics", "Engineering", "Physics & Engineering", "President's Office", "President", "Psychology", "Social Work", "Psychology & Social Work"] },
    { n: 24, name: "Davidian Hall", mapX: 996, mapY: 1084, mapR: 95, aliases: ["Davidian", "Nursing", "Nursing & Health Sciences", "Health Sciences"] },
    { n: 25, name: "Student Success Center", mapX: 1206, mapY: 1047, mapR: 95, aliases: ["SSC", "Success Center"] },
    { n: 26, name: "Dining Commons", mapX: 1472, mapY: 1058, mapR: 95, aliases: ["Dining", "Cafeteria", "Cafeteria Commons", "Campus Center", "Grind", "Student Association", "SA offices", "Student Association Offices", "lunch"] },
    { n: 27, name: "Rasmussen Art Gallery", mapX: 1754, mapY: 1132, mapR: 80, aliases: ["Rasmussen", "Art Gallery", "gallery"] },
    { n: 28, name: "Library (Utt Center)", mapX: 1749, mapY: 1047, mapR: 110, aliases: ["Library", "Utt", "Utt Center", "Walter C. Utt Center", "Nelson Memorial Library", "E.G. White", "EG White", "SDA Study Center", "Information Technology", "IT", "Library Computer Lab", "computer lab", "Pitcairn", "Pitcairn Islands Study Center"] },
    { n: 29, name: "Preparatory School", mapX: 1952, mapY: 1007, mapR: 95, aliases: ["Prep", "Prep School", "Academy prep"] },
    { n: 30, name: "Elementary School", mapX: 2897, mapY: 1073, mapR: 95, aliases: ["Elementary", "elem"] },
    { n: 31, name: "Advancement & Alumni", mapX: 672, mapY: 877, mapR: 95, aliases: ["Advancement", "Alumni Office", "Alumni Relations"] },
    { n: 32, name: "Financial Services", mapX: 1310, mapY: 933, mapR: 95, aliases: ["Financial", "Accounting", "Accounting Services", "Financial Administration", "Human Resources", "HR", "Student Financial Services"] },
    { n: 33, name: "Ricchiuti Hall", mapX: 1445, mapY: 934, mapR: 95, aliases: ["Ricchiuti", "Career Services", "Education"] },
    { n: 34, name: "West Hall Annex", mapX: 1541, mapY: 921, mapR: 80, aliases: ["West Hall", "Annex"] },
    { n: 35, name: "Stauffer Hall", mapX: 2022, mapY: 865, mapR: 95, aliases: ["Stauffer", "Alice Holst Theater", "Holst Theater", "theater", "theatre", "English"] },
    { n: 36, name: "Amphitheater", mapX: 2084, mapY: 942, mapR: 80, aliases: ["Amphitheatre"] },
    { n: 38, name: "Newton Hall", mapX: 1072, mapY: 830, mapR: 95, aliases: ["Newton", "Newton Chapel", "Newton Hall"] },
    { n: 39, name: "Grainger Hall", mapX: 1348, mapY: 765, mapR: 120, aliases: ["Grainger", "girls dorm", "girls' dorm", "girls"] },
    { n: 40, name: "Clark Hall", mapX: 1555, mapY: 734, mapR: 95, aliases: ["Clark", "Biology", "Wilmer Hansen Collection", "Hansen Collection"] },
    { n: 41, name: "Irwin Hall", mapX: 1703, mapY: 700, mapR: 95, aliases: ["Irwin", "Business", "Business Administration", "Economics", "Communication", "History", "World Languages", "Languages", "Cultures"] },
    { n: 42, name: "Ambs Hall", mapX: 1861, mapY: 705, mapR: 95, aliases: ["Ambs"] },
    { n: 43, name: "Graf Oval", mapX: 1943, mapY: 813, mapR: 110, aliases: ["Oval"] },
    { n: 44, name: "Graf Hall", mapX: 1988, mapY: 710, mapR: 110, aliases: ["Graf", "boys dorm", "boys' dorm", "boys", "Academic Records", "Admissions", "Enrollment", "Enrollment Services", "Marketing", "Media Services", "Student Services", "Visitor Center"] },
    { n: 45, name: "Dauphinee Chapel", mapX: 2265, mapY: 671, mapR: 80, aliases: ["Dauphinee", "Chapel"] },
    { n: 46, name: "Andre Hall", mapX: 2281, mapY: 784, mapR: 95, aliases: ["Andre"] },
    { n: 47, name: "Winning Hall", mapX: 2370, mapY: 722, mapR: 95, aliases: ["Winning", "Guest Housing", "Guest Housing Check-in"] },
    { n: 48, name: "Discoveryland Preschool", mapX: 2920, mapY: 819, mapR: 95, aliases: ["Discoveryland", "Preschool", "daycare"] },
    { n: 49, name: "Land Management", mapX: 148, mapY: 513, mapR: 95, aliases: ["Land Mgmt"] },
    { n: 51, name: "Facilities Management", mapX: 462, mapY: 573, mapR: 95, aliases: ["Facilities", "FM"] },
    { n: 52, name: "Mobile Manor", mapX: 639, mapY: 431, mapR: 95, aliases: ["Mobile"] },
    { n: 53, name: "Landscape", mapX: 807, mapY: 395, mapR: 95, aliases: ["Landscaping"] },
    { n: 54, name: "Court Place Apartments", mapX: 1098, mapY: 490, mapR: 110, aliases: ["Court Place", "Apartments", "Student Family Housing"] },
    { n: 55, name: "Nichol Hall", mapX: 1464, mapY: 427, mapR: 110, aliases: ["Nichol", "men's residence"] },
    { n: 56, name: "McReynolds Hall", mapX: 2008, mapY: 462, mapR: 110, aliases: ["McReynolds", "women's residence"] },
    { n: 57, name: "Virgil O. Parrett Field", mapX: 636, mapY: 153, mapR: 150, aliases: ["Parrett", "Parrett Field", "Flight Center", "Airport", "PUC Airport"] },
    { n: 58, name: "Young Observatory", mapX: 148, mapY: 150, mapR: 80, aliases: ["Observatory", "Young"] },
    { n: 60, name: "Prayer Chapel", mapX: 1581, mapY: 1051, mapR: 80, aliases: ["Prayer"] },
    { n: 61, name: "Cogeneration Plant", mapX: 255, mapY: 575, mapR: 80, aliases: ["Cogen", "Cogeneration"] },
    { n: null, name: "Campus Mall", mapX: 1665, mapY: 1048, mapR: 120, aliases: ["Mall", "the mall"] }
  ];

  function fold(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function autoAliases(b) {
    var extra = [];
    if (b.n != null) extra.push(String(b.n), "#" + b.n);
    var name = b.name || "";
    var m = name.match(/^(.+?)\s*\((.+)\)$/);
    if (m) extra.push(m[1].trim(), m[2].trim());
    var cleaned = name.replace(/\s*\(.+\)\s*$/, "").trim();
    var parts = cleaned.split(/\s+/);
    var generic = /^(hall|building|center|plaza|park|field|pool|courts|annex|house|manor|observatory|chapel|commons|gallery|school|office|plant|track|rooms)$/;
    if (parts.length >= 2 && generic.test(fold(parts[parts.length - 1]))) {
      extra.push(parts.slice(0, -1).join(" "));
    }
    // last distinctive word ("Parrett", "Dauphinee") when the name is long
    if (parts.length >= 3) {
      var last = parts[parts.length - 1];
      var next = parts[parts.length - 2];
      if (generic.test(fold(last))) extra.push(next + " " + last, next);
    }
    return extra;
  }

  buildings.forEach(function (b) {
    b.aliases = (b.aliases || []).concat(autoAliases(b));
  });

  function fields(b) {
    return [b.name].concat(b.aliases || []);
  }

  function score(b, qRaw) {
    var q = fold(qRaw);
    if (!q) return 0;
    var best = 0;
    var num = b.n != null ? String(b.n) : "";
    var qCompact = q.replace(/\s+/g, "");
    if (num && (q === num || q === "#" + num || qCompact === num || qCompact === "#" + num)) best = 1000;
    fields(b).forEach(function (f, i) {
      var s = fold(f);
      if (!s) return;
      var boost = i === 0 ? 20 : 0;
      if (s === q) best = Math.max(best, 900 + boost);
      else if (s.indexOf(q) === 0) best = Math.max(best, 700 + boost);
      else if ((" " + s).indexOf(" " + q) >= 0) best = Math.max(best, 620 + boost);
      else if (s.indexOf(q) >= 0) best = Math.max(best, 500 + boost);
    });
    if (num && /(?:^| )\d+$/.test(q) || /^#?\d+\s+/.test(q)) {
      var rest = fold(q.replace("#", " ").replace(num, " "));
      if (rest && fold(b.name).indexOf(rest) >= 0 && (q.indexOf(num) >= 0)) best = Math.max(best, 850);
    }
    return best;
  }

  function search(qRaw, limit) {
    var q = fold(qRaw);
    if (!q) return [];
    var cap = limit == null ? 8 : limit;
    return buildings.map(function (b) { return { b: b, s: score(b, qRaw) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, c) {
        if (c.s !== a.s) return c.s - a.s;
        var an = a.b.n == null ? 999 : a.b.n, cn = c.b.n == null ? 999 : c.b.n;
        return an - cn;
      })
      .slice(0, cap)
      .map(function (x) { return x.b; });
  }

  window.PUC_BUILDINGS = buildings;
  window.PUC_BUILDING_SEARCH = search;
})();

