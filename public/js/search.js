(() => {
  const root = document.body.dataset.root || "./";
  // Запрос, по которому ничего не нашлось, анонимно уходит на сервер (без IP) — по ним пишем новые статьи.
  const sent = new Set();
  const reportMiss = (q) => {
    q = q.trim().toLowerCase();
    if (q.length < 3 || sent.has(q)) return;
    sent.add(q);
    fetch("/api/miss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) }).catch(() => {});
  };
  const base = new URL(root + "pagefind/", location.href).href;
  const box = document.getElementById("search");
  const hint = box.dataset.hint;
  // из лупы в шапке приходят по ссылке …#search — сразу ставим курсор в поле
  const focus = location.hash === "#search";
  // чипсы-подсказки (data-q): подставляют запрос в строку; до загрузки поиска — запоминаем последний
  let setQuery = null, pending = null;
  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-q]");
    if (!chip) return;
    if (setQuery) setQuery(chip.dataset.q); else pending = chip.dataset.q;
  });

  // Основной поиск — Pagefind (полнотекстовый, с морфологией). Если его файлов нет — простой поиск по search.json.
  const s = document.createElement("script");
  s.src = base + "pagefind-ui.js";
  s.onload = () => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = base + "pagefind-ui.css";
    document.head.append(css);
    box.textContent = "";
    const ui = new PagefindUI({
      element: "#search", bundlePath: base, showImages: false, showSubResults: false, resetStyles: false,
      translations: { placeholder: hint }, autofocus: focus,
      // Pagefind отдаёт адреса от корня сайта; делаем их относительными к текущей странице
      processResult: (r) => {
        r.url = root + r.url.replace(/^\//, "").replace(/\.html$/, "");   // адреса без .html
        // под заголовком — начало ответа, а не совпадение в формулировках из чатов
        const sum = r.meta && r.meta.summary;
        if (sum) r.excerpt = sum.length > 160 ? sum.slice(0, 160).replace(/\s+\S*$/, "") + "…" : sum;
        // иначе Pagefind UI покажет весь ответ ещё раз блоком «Summary: …»
        if (r.meta) delete r.meta.summary;
        return r;
      },
    });
    setQuery = (q) => { ui.triggerSearch(q); box.querySelector(".pagefind-ui__search-input")?.focus(); };
    if (pending) setQuery(pending);
    let timer;
    box.addEventListener("input", (e) => {
      if (!e.target.matches(".pagefind-ui__search-input")) return;
      clearTimeout(timer);
      const q = e.target.value;
      // через 2 с после последней буквы: результатов нет, а сообщение о поиске уже показано
      timer = setTimeout(() => {
        if (e.target.value === q && !box.querySelector(".pagefind-ui__result") && box.querySelector(".pagefind-ui__message")) reportMiss(q);
      }, 2000);
    });
  };
  s.onerror = fallback;
  document.head.append(s);

  async function fallback() {
    box.innerHTML = '<input id="q" class="qinput" type="search" autocomplete="off"><ul class="qlist results"></ul>';
    const input = box.querySelector("#q"), out = box.querySelector(".results");
    input.placeholder = hint;
    if (focus) input.focus();
    let items = [];
    try { items = await (await fetch(root + "search.json")).json(); } catch { return; }
    // грубая «морфология»: сравниваем первые 5 букв слов, ё = е
    const norm = (t) => t.toLowerCase().replace(/ё/g, "е");
    const stems = (t) => norm(t).split(/[^a-zа-я0-9]+/).filter((w) => w.length > 1).map((w) => w.slice(0, 5));
    const idx = items.map((it) => ({ it, title: new Set(stems(it.title)), text: new Set(stems(it.text)) }));
    input.addEventListener("input", () => {
      const q = stems(input.value);
      out.textContent = "";
      if (!q.length) return;
      const hits = idx.map((x) => ({ x, score: q.reduce((s, w) => s + (x.title.has(w) ? 3 : x.text.has(w) ? 1 : 0), 0) }))
        .filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
      if (!hits.length) {
        out.innerHTML = '<li class="empty">Ничего не нашлось. Попробуйте другими словами.</li>';
        const v = input.value; setTimeout(() => { if (input.value === v) reportMiss(v); }, 2000);
        return;
      }
      for (const { x } of hits) {
        const li = document.createElement("li"), a = document.createElement("a"), q = document.createElement("span");
        a.href = root + "q/" + x.it.id; q.className = "q"; q.textContent = x.it.title;
        a.append(q); li.append(a); out.append(li);
      }
    });
    setQuery = (q) => { input.value = q; input.dispatchEvent(new Event("input")); input.focus(); };
    if (pending) setQuery(pending);
  }
})();
