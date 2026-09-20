/* Pitch Deck page-image viewer (services/pitch-deck.html)
 * Renders each deck as a scrollable strip of page images.
 * Clicking a page opens a full-screen lightbox containing every page
 * of that deck; Esc, backdrop click, or the X button closes it. */
(function () {
  'use strict';

  var strips = document.querySelectorAll('.deck-strip');
  if (!strips.length) return;

  var lightbox = document.getElementById('deck-lightbox');
  var body = document.getElementById('deck-lightbox-body');
  var title = document.getElementById('deck-lightbox-title');
  var closeBtn = lightbox.querySelector('.deck-lightbox-close');
  var lastFocused = null;
  var OPEN = 'is-open';
  var BODY_OPEN = 'deck-lightbox-open';

  function close() {
    if (!lightbox.classList.contains(OPEN)) return;
    lightbox.classList.remove(OPEN);
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove(BODY_OPEN);
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  function openFor(strip, clickedIndex) {
    var pageImgs = Array.prototype.map.call(strip.querySelectorAll('img'), function (img) {
      return img.cloneNode(true);
    });
    body.innerHTML = '';
    pageImgs.forEach(function (img) {
      body.appendChild(img);
    });
    title.textContent = strip.getAttribute('data-deck-title') || 'Pitch Deck';
    lastFocused = document.activeElement;
    lightbox.classList.add(OPEN);
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add(BODY_OPEN);
    if (clickedIndex >= 0) {
      var startAt = body.querySelectorAll('img')[clickedIndex];
      if (startAt) startAt.scrollIntoView({ block: 'start' });
    }
    closeBtn.focus();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('.deck-strip img') : null;
    if (img) {
      var strip = img.closest('.deck-strip');
      var index = Array.prototype.indexOf.call(strip.querySelectorAll('img'), img);
      openFor(strip, index);
      return;
    }
    var closer = e.target.closest ? e.target.closest('[data-close]') : null;
    if (closer && lightbox.classList.contains(OPEN)) close();
  });

  document.addEventListener('keydown', function (e) {
    if (lightbox.classList.contains(OPEN)) {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'Tab') {
        var focusables = lightbox.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.closest && t.closest('.deck-strip') &&
        (e.key === 'Enter' || e.key === ' ')) {
      var strip2 = t.closest('.deck-strip');
      var idx = Array.prototype.indexOf.call(strip2.querySelectorAll('img'), t);
      openFor(strip2, idx);
      e.preventDefault();
    }
  });

  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' &&
        (t.closest('.deck-strip') || t.closest('.deck-lightbox'))) {
      e.preventDefault();
    }
  });
})();