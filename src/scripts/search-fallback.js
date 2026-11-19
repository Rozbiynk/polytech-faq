// Запасной поиск, когда файлов Pagefind нет: по заголовкам и формулировкам из чатов (search.json).
// Возвращает функцию «подставить запрос» для чипсов-подсказок.
export async function mountFallback({ box, root, hint, label, autofocus, plain, reportMiss }) {
  box.innerHTML = '<input id="q" class="qinput" type="search" autocomplete="off"><ul class="qlist results"></ul>';
  const input = box.querySelector("#q"), out = box.querySelector(".results");
  input.placeholder = hint;
  input.setAttribute("aria-label", label);
  if (autofocus) input.focus();
  const setQuery = (q) => { input.value = q; input.dispatchEvent(new Event("input")); input.focus(); };

  let items = [];
  try { items = await (await fetch(root + "search.json")).json(); } catch { return setQuery; }
  // грубая «морфология»: сравниваем первые 5 букв слов, ё = е
  const norm = (t) => t.toLowerCase().replace(/ё/g, "е");
  const stems = (t) => norm(t).split(/[^a-zа-я0-9]+/).filter((w) => w.length > 1).map((w) => w.slice(0, 5));
  const index = items.map((it) => ({ it, title: new Set(stems(it.title)), text: new Set(stems(it.text)) }));

  input.addEventListener("input", () => {
    const words = stems(plain(input.value));
    out.textContent = "";
    if (!words.length) return;
    const hits = index.map((x) => ({ x, score: words.reduce((s, w) => s + (x.title.has(w) ? 3 : x.text.has(w) ? 1 : 0), 0) }))
      .filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!hits.length) {
      out.innerHTML = '<li class="empty">Ничего не нашлось. Попробуйте другими словами.</li>';
      const v = input.value;
      setTimeout(() => { if (input.value === v) reportMiss(v); }, 2000);
      return;
    }
    for (const { x } of hits) {
      const li = document.createElement("li"), a = document.createElement("a"), title = document.createElement("span");
      a.href = root + "q/" + x.it.id; title.className = "q"; title.textContent = x.it.title;
      a.append(title); li.append(a); out.append(li);
    }
  });
  return setQuery;
}
