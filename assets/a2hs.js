/* v10 · First-visit "Add to Home Screen" tip + little plus button.
 * Ported from Who's On Duty (logseib.github.io/whos-on-duty), which ported it
 * from the Card Tracker site. Same rules:
 *  - Already opened from the Home Screen (standalone): no button, no tip.
 *  - Phones/tablets: a plus button; the tip opens by itself ~800ms after
 *    load unless it was closed before (remembered in localStorage).
 *  - iOS gets the three Safari steps; other phones get one line about the
 *    browser menu.
 *  - Desktop: a bookmark button instead; the tip never opens by itself.
 *  - The button always reopens the tip. Closing (×) remembers "dismissed". */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  if (!$("a2hs") || !$("help")) return;
  var KEY = "attendancemaxingA2HS";
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var mobile = ios || /android|mobi/i.test(navigator.userAgent) || (window.matchMedia("(pointer:coarse)").matches && navigator.maxTouchPoints > 0);
  var mac = /mac/i.test(navigator.platform || "") || /Macintosh/.test(navigator.userAgent);
  var ICON_ADD = '<svg viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="3" width="16" height="16" rx="4.6"/><path d="M11 7.4v7.2M7.4 11h7.2"/></svg>';
  var ICON_BOOK = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M11 6.2C9.3 4.9 6.6 4.4 3.2 4.6v12.2c3.4-.2 6.1.3 7.8 1.6 1.7-1.3 4.4-1.8 7.8-1.6V4.6c-3.4-.2-6.1.3-7.8 1.6zM11 6.2v12.2"/></svg>';
  if (!ios) $("a2hsSteps").style.display = "none";
  if (!ios) $("a2hsText").innerHTML = "Open your browser menu and choose <b>Add to Home screen</b> or <b>Install app</b>.";
  if (mobile) { $("help").innerHTML = ICON_ADD; }
  else {
    $("help").innerHTML = ICON_BOOK; $("help").setAttribute("aria-label", "Bookmark this page");
    $("a2hs").setAttribute("aria-label", "Bookmark this page");
    $("a2hs").querySelector(".a2hsHead b").textContent = "Bookmark Attendancemaxing";
    $("a2hsText").innerHTML = "Press <b>" + (mac ? "\u2318D" : "Ctrl+D") + "</b> to bookmark this page.<br>In Safari, choose <b>Favorites</b> to keep it in your favorites bar.";
  }
  // (PUC tweak: the plus button hides while the tip is open, since the tip covers the map corner it sits in)
  var close = function (v) { ls.set(KEY, v); $("a2hs").style.display = "none"; $("help").style.visibility = ""; };
  $("a2hsX").onclick = function () { close("dismissed"); };
  var show = function () { $("a2hs").style.display = "block"; $("help").style.visibility = "hidden"; };
  if (standalone) { $("help").style.display = "none"; return; }
  $("help").onclick = show;
  if (!mobile || ls.get(KEY)) return;
  setTimeout(show, 800);
})();
