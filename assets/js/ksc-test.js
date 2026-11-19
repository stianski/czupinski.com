// Test „Czy moja firma podlega pod KSC?” — moduł bez zależności.
// Logika (evaluate) jest deterministyczna i oddzielona od interfejsu (mount),
// żeby dało się ją testować i osadzić w dowolnym frameworku strony.

// Działalności, którym ustawa nadaje status podmiotu kluczowego niezależnie od wielkości
// (art. 5 ust. 1 pkt 4 lit. a, b, c, h, i, j).
const KEY_ANY_SIZE = ["dns", "rejestrator", "zaufanie_kwal", "krytyczny", "jadrowy_operator"];

export function evaluate(a) {
  const notes = [];
  let outcome;
  const special = (a.special || []).filter((v) => v !== "brak");
  const has = (v) => special.includes(v);
  const small = a.size === "mikro" || a.size === "male";
  const atLeastMedium = a.size === "srednie" || a.size === "duze";

  // Podstawa: art. 5 ustawy o KSC w brzmieniu Dz.U. 2026 poz. 252 (zweryfikowano 18.11.2026,
  // docs/05-weryfikacja-testu-ksc.md). Wielkość według art. 2 załącznika I do rozporządzenia 651/2014/UE.

  // Art. 5 ust. 1: podmiot kluczowy.
  const key =
    special.some((v) => KEY_ANY_SIZE.includes(v)) ||   // ust. 1 pkt 4 lit. a–c, h–j: niezależnie od wielkości
    (has("telekom") && atLeastMedium) ||                // ust. 1 pkt 2: co najmniej średni
    (has("mssp") && a.size !== "mikro") ||              // ust. 1 pkt 3: co najmniej mały
    (has("zaufanie_niekwal") && a.size === "duze") ||   // dostawca usług zaufania jest w zał. nr 1 -> ust. 1 pkt 1
    (a.sector === "A1" && a.size === "duze");           // ust. 1 pkt 1: przewyższa wymogi średniego
  // Art. 5 ust. 2: podmiot ważny.
  const important =
    has("jadrowy_inwestor") ||                          // ust. 2 pkt 5: niezależnie od wielkości
    (has("telekom") && small) ||                        // ust. 2 pkt 4: mikro lub mały
    (has("zaufanie_niekwal") && a.size !== "duze") ||   // ust. 2 pkt 3: mikro, mały lub średni
    (a.sector === "A1" && a.size === "srednie") ||      // ust. 2 pkt 1
    (a.sector === "A2" && atLeastMedium);               // ust. 2 pkt 2

  // Kolejność ma znaczenie: kto spełnia przesłanki obu statusów, jest podmiotem kluczowym (art. 5 ust. 4).
  if (a.public === "tak") outcome = "PUBLICZNY";
  else if (key) outcome = "KLUCZOWY";
  else if (important) outcome = "WAZNY";
  else if (a.sector === "niepewne") outcome = "ANALIZA";
  else if ((a.sector === "A1" || a.sector === "A2") && small) outcome = a.ict === "tak" ? "ANALIZA" : "ZA_MALY";
  else outcome = a.ict === "tak" ? "ANALIZA" : "NIE";

  const subject = ["KLUCZOWY", "WAZNY"].includes(outcome);
  if (subject) notes.push("termin", "wdrozenie");
  if (!subject && a.clients !== "nie" && outcome !== "PUBLICZNY") notes.push("lancuch");
  return { outcome, notes, subject };
}

// Które pytania zadać: po odpowiedzi „podmiot publiczny” kończymy od razu.
export function nextQuestion(tree, a) {
  if (a.public === "tak") return null;
  return tree.questions.find((q) => a[q.id] === undefined) || null;
}

export function mount(root, tree, { onResult } = {}) {
  const answers = {};
  const h = (tag, props = {}, kids = []) => {
    const n = Object.assign(document.createElement(tag), props);
    kids.forEach((k) => n.append(k));
    return n;
  };

  function render() {
    root.textContent = "";
    const q = nextQuestion(tree, answers);
    if (!q) return renderResult();
    const idx = tree.questions.indexOf(q) + 1;
    const form = h("form", { className: "ksc-q" });
    form.append(h("p", { className: "ksc-step", textContent: `Pytanie ${idx} z ${tree.questions.length}` }), h("h3", { textContent: q.text }));
    if (q.hint) form.append(h("p", { className: "ksc-hint", textContent: q.hint }));
    (q.groups || []).forEach((g) => form.append(h("details", {}, [h("summary", { textContent: g.label }), h("ul", {}, g.items.map((i) => h("li", { textContent: i })))])));
    const inputs = q.options.map((o) => {
      const input = h("input", { type: q.multi ? "checkbox" : "radio", name: q.id, value: o.v });
      if (q.multi) input.addEventListener("change", () => {
        if (!input.checked) return;
        inputs.forEach((x) => { if (x.i !== input && (o.exclusive || x.o.exclusive)) x.i.checked = false; });
      });
      form.append(h("label", { className: "ksc-opt" }, [input, h("span", { textContent: o.label })]));
      return { i: input, o };
    });
    const err = h("p", { className: "ksc-err", role: "alert" });
    const back = h("button", { type: "button", textContent: "Wstecz", className: "ksc-back" });
    back.disabled = idx === 1;
    back.addEventListener("click", () => { delete answers[tree.questions[idx - 2].id]; render(); });
    form.append(err, h("div", { className: "ksc-nav" }, [back, h("button", { type: "submit", textContent: "Dalej", className: "ksc-next" })]));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const picked = inputs.filter((x) => x.i.checked).map((x) => x.o.v);
      if (!picked.length) { err.textContent = "Wybierz odpowiedź."; return; }
      answers[q.id] = q.multi ? picked : picked[0];
      render();
    });
    root.append(form);
  }

  function renderResult() {
    const res = evaluate(answers);
    const o = tree.outcomes[res.outcome];
    const box = h("div", { className: "ksc-result" }, [h("h3", { textContent: o.title }), h("p", { textContent: o.text })]);
    res.notes.forEach((n) => box.append(h("p", { className: "ksc-note", textContent: tree.notes[n] })));
    box.append(h("p", { className: "ksc-disclaimer", textContent: tree.disclaimer }));
    const again = h("button", { type: "button", textContent: "Zacznij od nowa" });
    again.addEventListener("click", () => { Object.keys(answers).forEach((k) => delete answers[k]); render(); });
    box.append(again);
    root.append(box);
    if (onResult) onResult(res, { ...answers }); // tu podepnij CTA: raport luk / zapis na newsletter
  }

  render();
}
