/* ==========================================================================
   BLACKBOX.JS — Client-side renderer for the Black Box log feed.
   Reads GET /api/posts from the Node backend (server/). The admin console
   at /admin adds, edits, and deletes entries. Requires the server running.
   ========================================================================== */

(function () {
  'use strict';

// CONFIGURATION — set the base API URL for the backend.
//   - In development, this should match the port your Node backend runs on.
//   - In production, set this to your deployed API base (e.g. https://example.com/api).
//   - If left as '/', the script will auto-detect the current origin.
//   - WHEN USING LIVE SERVER ON A DIFFERENT PORT, set THIS to 'http://localhost:3123/api'
//     so the Black Box page can fetch posts even when served from a different origin.
  var API_BASE = '/api';  // CHANGE THIS if your backend runs on a different origin/port

  var stackEl = document.querySelector('.log-stack');
  var countEl = document.getElementById('log-count');
  if (!stackEl) return;

  var SAFE_EMBED_PREFIXES = [
    'https://www.youtube.com/embed/',
    'https://player.vimeo.com/video/',
  ];

  // Build the three fetch sources for the Black Box post feed.
  // Source 1: relative to current origin (e.g. /api/posts when served from http://localhost:3123)
  // Source 2: explicit localhost fallback — ALWAYS points to http://localhost:3123/api/posts
  //   This is the key fix: ensures the Black Box page can always fetch posts
  //   even when served from a different origin (e.g. Live Server on port 5500, file://).
  // Source 3: static mirror at /data/posts.json — works on any static host
  function buildSources() {
    var source1 = '/api/posts';
    var source2 = 'http://localhost:3123/api/posts';
    var source3 = '/data/posts.json';
    return [source1, source2, source3].filter(function (s) { return s; });
  }

  var SOURCES = buildSources();

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function loadPosts() {
    var i = 0;
    function next() {
      if (i >= SOURCES.length) return Promise.reject(new Error('no sources left'));
      var url = SOURCES[i];
      i += 1;
      return fetchJson(url).catch(next);
    }
    return next();
  }

  loadPosts()
    .then(function (data) {
      var posts = Array.isArray(data) ? data : (data && data.posts) || [];
      render(posts);
    })
    .catch(function () {
      renderQuiet('no-feed');
    });

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */
  function render(posts) {
    if (!posts.length) {
      renderQuiet('empty');
      return;
    }

    if (countEl) {
      countEl.textContent = 'LOGS RETRIEVED: ' + posts.length;
    }

    stackEl.innerHTML = posts.map(entryMarkup).join('');
  }

  function renderQuiet(reason) {
    if (countEl) {
      countEl.textContent = 'LOGS RETRIEVED: 0 — AWAITING FIRST TRANSMISSION';
    }
    var note =
      reason === 'no-feed'
        ? 'The channel is quiet — the feed could not be reached. Try again shortly.'
        : 'The box is empty. Entries appear here the moment they are transmitted.';
    stackEl.innerHTML =
      '<article class="log-entry">' +
        '<div class="log-meta">' +
          '<span>Status</span><span>Awaiting Input</span>' +
        '</div>' +
        '<h3>No logs retrieved</h3>' +
        '<p>' + note + '</p>' +
      '</article>';
  }

  function entryMarkup(post) {
    var html = '';

    html += '<article class="log-entry">';
    html += '<div class="log-meta">' +
      '<span>Entry ' + esc(post.entryNumber) + '</span>' +
      '<span>' + esc(post.category) + '</span>' +
      '</div>';
    html += '<h3>' + esc(post.title) + '</h3>';

    paragraphs(post.body).forEach(function (para) {
      html += '<p>' + esc(para) + '</p>';
    });

    var images = imageList(post.images);
    if (images.length) {
      var grid = images.length > 1 ? ' log-media-grid' : '';
      html += '<div class="log-media' + grid + '">';
      images.forEach(function (url) {
        html += '<figure><img src="' + esc(url) + '" alt="" loading="lazy"></figure>';
      });
      html += '</div>';
    }

    if (post.audio) {
      html += '<div class="log-media">' +
        '<audio controls preload="metadata" src="' + esc(post.audio) + '"></audio>' +
        '</div>';
    }

    var embed = safeEmbed(post.videoEmbed) || safeEmbed(toEmbedUrl(post.videoOriginal));
    if (embed) {
      html += '<div class="log-media embed-slot">' +
        '<iframe src="' + esc(embed) + '" title="Embedded video" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen loading="lazy"></iframe>' +
        '</div>';
    } else if (post.videoOriginal) {
      html += '<p><a href="' + esc(post.videoOriginal) + '" target="_blank" rel="noopener">' +
        esc(post.videoOriginal) + '</a></p>';
    }

    html += '</article>';
    return html;
  }

  /* ------------------------------------------------------------------------
     Data helpers
     ------------------------------------------------------------------------ */
  function paragraphs(body) {
    if (Array.isArray(body)) {
      return body.map(function (s) { return String(s).trim(); }).filter(Boolean);
    }
    return String(body || '')
      .split(/\n\s*\n/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  // Decap list-of-images can be ["/media/a.png", ...] or [{image:"/media/a.png"}, ...]
  function imageList(images) {
    if (!Array.isArray(images)) return [];
    return images
      .map(function (item) {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.image || item.url || null;
        return null;
      })
      .filter(Boolean);
  }

  function toEmbedUrl(value) {
    var original = String(value || '').trim();
    if (!original) return null;
    var yt = original.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1];
    var vimeo = original.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return 'https://player.vimeo.com/video/' + vimeo[1];
    return null;
  }

  function safeEmbed(embed) {
    if (!embed) return null;
    for (var i = 0; i < SAFE_EMBED_PREFIXES.length; i += 1) {
      if (String(embed).indexOf(SAFE_EMBED_PREFIXES[i]) === 0) return embed;
    }
    return null;
  }

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }
})();