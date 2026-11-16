/*
 * nav.js - trzy drobne ulepszenia nawigacji. Ładowany z atrybutem defer,
 * czyli wykonuje się po wczytaniu całego HTML i niczego nie blokuje.
 *
 *   1. Rozwijane menu na telefonie (przycisk w nagłówku).
 *   2. Podświetlenie w menu sekcji, którą akurat widać.
 *   3. Cienki pasek postępu przewijania pod nagłówkiem.
 *
 * Bez JavaScriptu strona działa jak wcześniej: menu jest zawsze widoczne
 * (na telefonie przewija się w poziomie), a przycisk menu jest ukryty w CSS.
 * Teksty etykiet siedzą w atrybutach data-* w HTML, żeby każda wersja
 * językowa miała własne tłumaczenie bez zmian w tym pliku.
 */
(function () {
  'use strict';

  var naglowek = document.querySelector('.site-header');
  var menu = document.querySelector('.site-nav');
  if (!naglowek || !menu) {
    return;
  }

  // 1. MENU NA TELEFONIE ----------------------------------------------------
  var przycisk = document.querySelector('[data-nav-toggle]');
  if (przycisk) {
    var ustaw = function (otwarte) {
      // aria-expanded mówi czytnikom ekranu, czy panel jest rozwinięty.
      przycisk.setAttribute('aria-expanded', otwarte ? 'true' : 'false');
      przycisk.setAttribute(
        'aria-label',
        przycisk.getAttribute(otwarte ? 'data-label-close' : 'data-label-open')
      );
      menu.classList.toggle('is-open', otwarte);
    };

    var otwarte = function () {
      return przycisk.getAttribute('aria-expanded') === 'true';
    };

    przycisk.addEventListener('click', function () {
      ustaw(!otwarte());
    });

    // Esc zamyka menu i oddaje fokus przyciskowi, żeby nie "zgubić" miejsca na stronie.
    document.addEventListener('keydown', function (zdarzenie) {
      if (zdarzenie.key === 'Escape' && otwarte()) {
        ustaw(false);
        przycisk.focus();
      }
    });

    // Po wybraniu sekcji panel nie powinien zasłaniać treści.
    menu.addEventListener('click', function (zdarzenie) {
      if (zdarzenie.target.closest('a')) {
        ustaw(false);
      }
    });

    ustaw(false);
  }

  // 2. AKTYWNA SEKCJA -------------------------------------------------------
  // IntersectionObserver zgłasza, która sekcja przecina poziomą linię
  // w połowie wysokości okna. Link do niej dostaje aria-current.
  var linki = {};
  Array.prototype.forEach.call(menu.querySelectorAll('a[href^="#"]'), function (link) {
    linki[link.getAttribute('href').slice(1)] = link;
  });

  if ('IntersectionObserver' in window) {
    var obserwator = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (wpis) {
        var link = linki[wpis.target.id];
        if (!link) {
          return;
        }
        if (wpis.isIntersecting) {
          Object.keys(linki).forEach(function (id) {
            linki[id].removeAttribute('aria-current');
          });
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    Object.keys(linki).forEach(function (id) {
      var sekcja = document.getElementById(id);
      if (sekcja) {
        obserwator.observe(sekcja);
      }
    });
  }

  // 3. PASEK POSTĘPU --------------------------------------------------------
  // Element tworzymy w skrypcie, bo bez JS nie miałby sensu. Szerokość ustawia
  // "transform" (przez CSSOM, co polityka CSP dopuszcza), bo nie wymusza
  // ponownego układania strony przy każdym ruchu.
  var pasek = document.createElement('div');
  pasek.className = 'scroll-progress';
  pasek.setAttribute('aria-hidden', 'true');
  naglowek.appendChild(pasek);

  var zaplanowane = false;
  function odswiezPasek() {
    zaplanowane = false;
    var doPrzewiniecia = document.documentElement.scrollHeight - window.innerHeight;
    var postep = doPrzewiniecia > 0 ? window.scrollY / doPrzewiniecia : 0;
    pasek.style.transform = 'scaleX(' + Math.min(1, Math.max(0, postep)) + ')';
  }

  // requestAnimationFrame ogranicza pracę do jednego razu na klatkę.
  function zaplanuj() {
    if (!zaplanowane) {
      zaplanowane = true;
      window.requestAnimationFrame(odswiezPasek);
    }
  }

  window.addEventListener('scroll', zaplanuj, { passive: true });
  window.addEventListener('resize', zaplanuj);
  odswiezPasek();
})();
