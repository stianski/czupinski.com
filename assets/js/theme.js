/*
 * theme.js - przełącznik motywu ciemny/jasny.
 *
 * Plik jest ładowany w <head> BEZ atrybutów defer/async. To celowe:
 * przeglądarka wykona go, zanim narysuje cokolwiek z <body>, więc zapisany
 * motyw jest ustawiony od pierwszej klatki i nie ma "mignięcia" złych kolorów.
 * Skrypt jest w osobnym pliku (a nie wpisany w HTML), żeby polityka CSP
 * mogła zabronić wszystkich skryptów inline.
 *
 * Bez JavaScriptu strona po prostu zostaje w motywie ciemnym,
 * a przycisk przełącznika jest ukryty w CSS.
 */
(function () {
  'use strict';

  var KLUCZ = 'motyw';
  var html = document.documentElement;

  // localStorage potrafi rzucić wyjątek (tryb prywatny, zablokowane dane witryny),
  // dlatego każdy odczyt i zapis jest w try/catch. Wtedy wybór działa do odświeżenia.
  function odczytaj() {
    try {
      var zapisany = window.localStorage.getItem(KLUCZ);
      return zapisany === 'light' || zapisany === 'dark' ? zapisany : null;
    } catch (blad) {
      return null;
    }
  }

  function zapisz(motyw) {
    try {
      window.localStorage.setItem(KLUCZ, motyw);
    } catch (blad) {
      // Nic nie robimy: motyw i tak jest już ustawiony na stronie.
    }
  }

  // Przy pierwszej wizycie (nic jeszcze nie zapisano) bierzemy ustawienie systemu.
  // Jeśli system nie mówi wprost "jasny", zostaje motyw ciemny.
  function systemowy() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (blad) {
      return 'dark';
    }
  }

  // 1. Od razu, jeszcze przed narysowaniem strony. Zapisany wybór ma pierwszeństwo.
  html.setAttribute('data-theme', odczytaj() || systemowy());
  html.classList.add('js'); // sygnał dla CSS, że można pokazać przycisk

  // 2. Przycisk istnieje dopiero po wczytaniu <body>, więc na niego czekamy.
  document.addEventListener('DOMContentLoaded', function () {
    var przycisk = document.querySelector('[data-theme-toggle]');
    if (!przycisk) {
      return;
    }

    // Etykieta dla czytników ekranu mówi, co się stanie po kliknięciu.
    // Teksty siedzą w atrybutach data-* w HTML, żeby każda wersja językowa
    // miała własne tłumaczenie bez zmian w tym pliku.
    function odswiezEtykiete() {
      var jasny = html.getAttribute('data-theme') === 'light';
      przycisk.setAttribute(
        'aria-label',
        przycisk.getAttribute(jasny ? 'data-label-dark' : 'data-label-light')
      );
    }

    przycisk.addEventListener('click', function () {
      var nowy = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', nowy);
      zapisz(nowy);
      odswiezEtykiete();
    });

    odswiezEtykiete();
  });
})();
