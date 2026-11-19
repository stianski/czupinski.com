/*
 * ksc-strona.js - interfejs testu "Czy moja firma podlega pod KSC?" na czupinski.com.
 *
 * Podział odpowiedzialności:
 *   - Wynik liczy WYŁĄCZNIE evaluate() z ksc-test.js. Tamten plik jest kopią 1:1 z projektu
 *     ksc-compliance (pilnuje tego tools\sync-ksc.ps1) i nie wolno go tu poprawiać.
 *   - Pytania, wyniki i uwagi są w pliku JSON (osobny dla PL i EN), wskazanym w data-tree.
 *   - Teksty interfejsu ("Dalej", "zmień"...) siedzą w atrybutach data-t-* i w znacznikach
 *     <template> w HTML, żeby każda wersja językowa miała własne bez zmian w tym pliku.
 *
 * Układ: najpierw pytanie albo wynik, potem zapis odpowiedzi. Na szerokim ekranie CSS stawia
 * zapis w lewej kolumnie; na telefonie zapis jest zwinięty do jednego wiersza pod pytaniem.
 *
 * Odpowiedzi nie opuszczają przeglądarki: skrypt niczego nie wysyła i niczego nie zapisuje.
 * Jedyne zapytanie sieciowe to pobranie pliku z pytaniami z tej samej domeny.
 */
import { evaluate, nextQuestion } from "./ksc-test.js";

const root = document.querySelector("[data-ksc]");
if (root) start(root);

async function start(root) {
  const app = root.querySelector("[data-ksc-app]");

  // Tekst interfejsu z atrybutu data-t-<klucz>; {n} w tekście podmieniane na wartości.
  const t = (key, vars = {}) =>
    (root.dataset["t" + key[0].toUpperCase() + key.slice(1)] || "").replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

  // Mały pomocnik do budowania elementów. Treść zawsze przez textContent, nigdy innerHTML.
  const h = (tag, props = {}, kids = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids);
    return node;
  };

  let tree;
  try {
    const response = await fetch(root.dataset.tree);
    if (!response.ok) throw new Error(String(response.status));
    tree = await response.json();
  } catch (error) {
    // Bez pytań narzędzie nie ma sensu: pokazujemy gotowy komunikat z HTML.
    app.hidden = true;
    root.querySelector("[data-ksc-fallback]").hidden = false;
    return;
  }

  const answers = {};  // bieżące odpowiedzi, wejście dla evaluate()
  const last = {};     // ostatnio wybrane wartości, żeby po powrocie pytanie było wstępnie zaznaczone
  let logOpen = false; // telefon: czy zapis odpowiedzi jest rozwinięty
  const total = tree.questions.length;

  const optionText = (question, value) => {
    const option = question.options.find((o) => o.v === value);
    return option ? option.short || option.label : "";
  };

  const answerText = (question) => [].concat(answers[question.id]).map((v) => optionText(question, v)).join(", ");

  // Powrót do pytania: odpowiedź znika z wyniku, ale zostaje zapamiętana jako wstępne zaznaczenie.
  function reopen(question) {
    last[question.id] = answers[question.id];
    delete answers[question.id];
    render(true);
  }

  // ZAPIS ODPOWIEDZI --------------------------------------------------------
  function renderLog(current) {
    const list = h("ol", { className: "ksc-log", id: "ksc-log" });
    let answered = 0;
    for (const question of tree.questions) {
      const label = h("span", { className: "q", textContent: question.short });
      const row = h("li");
      if (question === current) {
        row.className = "is-current";
        row.setAttribute("aria-current", "step");
        row.append(h("span", { className: "ksc-log-row" }, [label, h("span", { className: "a", textContent: t("pending") })]));
      } else if (answers[question.id] !== undefined) {
        answered += 1;
        // Cały wiersz jest przyciskiem: wygodny cel dla palca i jedno miejsce na klawiaturze.
        const text = answerText(question);
        const change = h("button", { type: "button", className: "ksc-log-row" }, [
          label,
          h("span", { className: "a", textContent: text }),
          h("span", { className: "ksc-change", textContent: t("change") }),
        ]);
        change.setAttribute("aria-label", t("changeLabel", { q: question.short, a: text }));
        change.addEventListener("click", () => reopen(question));
        row.append(change);
      } else {
        row.className = "is-empty";
        row.append(h("span", { className: "ksc-log-row" }, [label, h("span", { className: "a", textContent: "—" })]));
      }
      list.append(row);
    }

    // Przełącznik widać tylko na wąskim ekranie (CSS); na szerokim zapis jest zawsze rozwinięty.
    // Tekst przełącznika dzielimy przed nawiasem, żeby licznik "(2 z 6)" mógł mieć kolor akcentu.
    const [toggleLabel, toggleCount = ""] = t("logCount", { n: answered, m: total }).split(/(?=\()/);
    const toggle = h("button", { type: "button", className: "ksc-log-toggle" }, [
      h("span", {}, [toggleLabel, h("span", { className: "ksc-log-count", textContent: toggleCount })]),
    ]);
    toggle.setAttribute("aria-controls", "ksc-log");
    toggle.setAttribute("aria-expanded", String(logOpen));
    const aside = h("div", { className: "ksc-aside" + (logOpen ? " is-open" : "") }, [
      h("p", { className: "ksc-log-title", textContent: t("log") }),
      toggle,
      list,
      h("p", { className: "ksc-privacy", textContent: t("privacy") }),
    ]);
    toggle.addEventListener("click", () => {
      logOpen = !logOpen;
      aside.classList.toggle("is-open", logOpen);
      toggle.setAttribute("aria-expanded", String(logOpen));
    });
    return aside;
  }

  // PYTANIE -----------------------------------------------------------------
  function renderQuestion(question) {
    const index = tree.questions.indexOf(question);
    const legend = h("legend", { tabIndex: -1 }, [
      h("span", { className: "ksc-kicker", textContent: t("step", { n: index + 1, m: total }) }),
      question.text,
    ]);
    const fieldset = h("fieldset", { className: "ksc-q" }, [legend]);
    if (question.hint) fieldset.append(h("p", { className: "ksc-hint", textContent: question.hint }));

    const previous = [].concat(last[question.id] ?? []);
    const inputs = question.options.map((option) => {
      const input = h("input", { type: question.multi ? "checkbox" : "radio", name: question.id, value: option.v });
      input.checked = previous.includes(option.v);
      return { input, option };
    });
    // Odpowiedź wykluczająca ("żadna z powyższych") nie może być zaznaczona razem z innymi.
    if (question.multi) {
      for (const { input, option } of inputs) {
        input.addEventListener("change", () => {
          if (!input.checked) return;
          for (const other of inputs) {
            if (other.input !== input && (option.exclusive || other.option.exclusive)) other.input.checked = false;
          }
        });
      }
    }

    fieldset.append(h("div", { className: "ksc-opts" }, inputs.map(({ input, option }) => {
      const row = h("div", { className: "ksc-opt-row" }, [
        h("label", { className: "ksc-opt" }, [input, h("span", { textContent: option.label })]),
      ]);
      // Lista z załącznika stoi pod odpowiedzią, której dotyczy (to samo "v" w grupie i w odpowiedzi).
      const group = (question.groups || []).find((g) => g.v === option.v);
      if (group) {
        row.append(h("details", { className: "ksc-more" }, [
          h("summary", { textContent: t("group", { n: group.items.length }) }),
          h("ul", {}, group.items.map((item) => h("li", { textContent: item }))),
        ]));
      }
      return row;
    })));

    const error = h("p", { className: "ksc-err" });
    error.setAttribute("role", "alert");
    const nav = h("div", { className: "ksc-nav" }, [h("button", { type: "submit", className: "button", textContent: t("next") })]);
    if (index > 0) {
      const back = h("button", { type: "button", className: "button button-ghost ksc-back ksc-prev", textContent: t("back") });
      back.addEventListener("click", () => reopen(tree.questions[index - 1]));
      nav.append(back);
    }
    const form = h("form", { noValidate: true }, [fieldset, error, nav]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const picked = inputs.filter((x) => x.input.checked).map((x) => x.option.v);
      if (!picked.length) {
        error.textContent = t("error");
        return;
      }
      answers[question.id] = question.multi ? picked : picked[0];
      render(true);
    });
    return { node: h("div", { className: "ksc-body" }, [form]), focus: legend };
  }

  // WYNIK -------------------------------------------------------------------
  // Zapis odpowiedzi (log) wchodzi do środka wyniku, zaraz pod opisem: na telefonie widać dzięki
  // temu, z czego wynik powstał; na szerokim ekranie CSS przenosi go do lewej kolumny.
  function renderResult(log) {
    const result = evaluate(answers);
    const outcome = tree.outcomes[result.outcome];

    // Tytuł wyniku z wyróżnionym fragmentem (pole "emphasis" w drzewie jest częścią tytułu).
    const verdict = h("h2", { className: "ksc-verdict", tabIndex: -1 });
    const at = outcome.emphasis ? outcome.title.indexOf(outcome.emphasis) : -1;
    if (at >= 0) {
      verdict.append(outcome.title.slice(0, at), h("em", { textContent: outcome.emphasis }), outcome.title.slice(at + outcome.emphasis.length));
    } else {
      verdict.textContent = outcome.title;
    }

    const box = h("div", { className: "ksc-body ksc-result" }, [
      h("span", { className: "ksc-kicker", textContent: t("result") }),
      verdict,
      h("p", { className: "ksc-result-text", textContent: outcome.text }),
      log,
    ]);

    if (result.notes.length) {
      box.append(h("dl", { className: "ksc-notes" }, result.notes.map((note) =>
        h("div", {}, [h("dt", { textContent: tree.noteLabels[note] }), h("dd", { textContent: tree.notes[note] })]))));
    }

    // Następny krok: gotowy blok z HTML. Dla wyników bez propozycji nie pokazujemy nic.
    const next = result.subject ? "subject" : result.outcome === "ANALIZA" ? "analysis" : "";
    const template = next && root.querySelector(`template[data-ksc-next="${next}"]`);
    if (template) box.append(template.content.cloneNode(true));

    // "Zacznij od nowa": cichy przycisk tekstowy we własnym wierszu, pod propozycją.
    const restart = h("button", { type: "button", className: "ksc-textbtn", textContent: t("restart") });
    restart.addEventListener("click", () => {
      for (const key of Object.keys(answers)) delete answers[key];
      for (const key of Object.keys(last)) delete last[key];
      render(true);
    });
    box.append(h("div", { className: "ksc-nav" }, [restart]));

    // data-locale pozwala wersji angielskiej wybrać zapis brytyjski ("18 November 2026").
    const date = new Intl.DateTimeFormat(root.dataset.locale || document.documentElement.lang, { day: "numeric", month: "long", year: "numeric" })
      .format(new Date(tree.updated + "T12:00:00"));
    // Treść przed weryfikacją prawną dostaje dodatkowe zdanie pod zastrzeżeniem. Publikację takiej
    // treści blokuje tools\publikuj.ps1, więc zdanie widać tylko w podglądzie lokalnym.
    box.append(h("p", { className: "ksc-meta", textContent: tree.disclaimer + " " + t("meta", { v: tree.version, d: date }) }));
    // Podstawa prawna treści (pole "source" w drzewie), jeśli jest podana.
    if (tree.source) box.append(h("p", { className: "ksc-meta", textContent: tree.source }));
    if (/^\s*DRAFT/.test(tree.status)) box.append(h("p", { className: "ksc-meta", textContent: t("draft") }));

    return { node: box, focus: verdict };
  }

  // Gdy test kończy się wcześniej (np. po zmianie pierwszej odpowiedzi na "podmiot publiczny"),
  // dalsze odpowiedzi nie biorą udziału w wyniku. Usuwamy je, żeby zapis pokazywał dokładnie to,
  // z czego wynik powstał; zostają zapamiętane na wypadek powrotu do pytania.
  function prune() {
    const asked = {};
    for (let q = nextQuestion(tree, asked); q && answers[q.id] !== undefined; q = nextQuestion(tree, asked)) {
      asked[q.id] = answers[q.id];
    }
    for (const key of Object.keys(answers)) {
      if (!(key in asked)) {
        last[key] = answers[key];
        delete answers[key];
      }
    }
  }

  // Po każdej zmianie rysujemy całość od nowa: to sześć wierszy i jedno pytanie.
  // moveFocus = true po akcji użytkownika: fokus (i czytnik ekranu) trafia na nowe pytanie albo wynik.
  function render(moveFocus) {
    const current = nextQuestion(tree, answers);
    if (!current) prune();
    const log = renderLog(current);
    const main = current ? renderQuestion(current) : renderResult(log);
    if (current) app.replaceChildren(main.node, log);
    else app.replaceChildren(main.node);
    // Sygnał dla CSS: test rozpoczęty (na telefonie chowa wstęp nad narzędziem).
    document.body.classList.toggle("ksc-started", !current || Object.keys(answers).length > 0);
    if (moveFocus) {
      main.focus.focus({ preventScroll: true });
      // Jeśli pytanie albo werdykt wypadły nisko lub poza ekranem, przewijamy do nich
      // (scroll-padding-top z CSS zostawia miejsce na przyklejony nagłówek).
      const top = main.focus.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) main.focus.scrollIntoView({ block: "start" });
    }
  }

  render(false);
}
