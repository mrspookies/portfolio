/* ==========================================================================
   PORTFOLIO.JS — Shared Navigation & Interaction
   Vanilla JS, no dependencies.
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initYear();
    initMobileNav();
    initDropdowns();
    initModals();
    initFormModals();
    initAudioGuard();
  });

  /**
   * Stamp the current year into any #year element (used in the footer).
   */
  function initYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  /**
   * Toggle the mobile navigation drawer via the hamburger button.
   */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the drawer whenever a plain nav link is followed.
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /**
   * Click-to-toggle dropdown (e.g. WORK), with outside-click and
   * Escape-key dismissal. Hover is handled purely in CSS for desktop;
   * this covers touch/keyboard interaction.
   */
  function initDropdowns() {
    var navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(function (item) {
      var toggle = item.querySelector('.dropdown-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        var isOpen = item.classList.contains('open');

        closeAllDropdowns();

        if (!isOpen) {
          item.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', closeAllDropdowns);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAllDropdowns();
      }
    });

    function closeAllDropdowns() {
      navItems.forEach(function (item) {
        item.classList.remove('open');
        var toggle = item.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  /**
   * Floating dossier windows (offers page). Buttons carrying
   * [data-modal-open="tier-i"] open #modal-tier-i; the window closes via
   * the backdrop, its close button, or Escape.
   */
  function initModals() {
    var openers = document.querySelectorAll('[data-modal-open]');
    var modals = document.querySelectorAll('.modal');
    if (!openers.length || !modals.length) return;

    openers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var modal = document.getElementById(
          'modal-' + btn.getAttribute('data-modal-open')
        );
        if (modal) openModal(modal);
      });
    });

    modals.forEach(function (modal) {
      modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
        el.addEventListener('click', function () {
          closeModal(modal);
        });
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        modals.forEach(closeModal);
      }
    });

    function openModal(modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      var closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function closeModal(modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Onboarding form windows (offers page). Submits each form as JSON to
   * /api/submissions and reports the saved file name without navigating.
   * If the local backend is unreachable (e.g. the site is served from
   * GitHub Pages), the message is delivered through the free mail relay
   * instead, so the site's contact forms keep working when published.
   */
  var FORM_RELAY_URL = 'mr.spookies.83@gmail.com';

  function submitToBackend(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) throw new Error(json.error || 'Submission failed.');
        return json;
      });
    });
  }

  function submitToRelay(data) {
    return fetch('https://formsubmit.co/ajax/' + FORM_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok || (json && json.success === 'false')) {
          throw new Error((json && json.message) || 'Live relay failed.');
        }
        return json;
      });
    });
  }

  function initFormModals() {
    var forms = document.querySelectorAll('.form-shell[data-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.querySelector('.form-status');
        var data = {};
        new FormData(form).forEach(function (value, key) {
          data[key] = String(value).trim();
        });
        setStatus(status, 'Transmitting...', '');

        submitToBackend(form.action, data)
          .then(function (json) {
            setStatus(
              status,
              'Transmission received — saved to backend as ' + json.file + '.',
              'ok'
            );
            form.reset();
          })
          .catch(function () {
            if (FORM_RELAY_URL.indexOf('@') === -1) {
              setStatus(status, 'Error: live relay not configured yet.', 'error');
              return;
            }
            return submitToRelay(data)
              .then(function () {
                setStatus(status, 'Message sent — thank you. I\u2019ll reply soon.', 'ok');
                form.reset();
              })
              .catch(function (err) {
                setStatus(status, 'Error: ' + err.message, 'error');
              });
          });
      });
    });

    function setStatus(el, message, state) {
      el.textContent = message;
      el.className = 'form-note form-status' + (state ? ' ' + state : '');
    }
  }

  /**
   * Guard <audio> players against download — no download control, no
   * right-click "save", no drag-out of the element.
   */
  function initAudioGuard() {
    var audios = document.querySelectorAll('audio');
    if (!audios.length) return;

    audios.forEach(function (audio) {
      audio.addEventListener('contextmenu', function (event) {
        event.preventDefault();
      });
      audio.addEventListener('dragstart', function (event) {
        event.preventDefault();
      });
    });
  }
})();
