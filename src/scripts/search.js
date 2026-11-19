// Поиск (components/Search.astro). Основной — Pagefind: полнотекстовый, с морфологией. Если его файлов нет
// (превью без каталога pagefind/) — простой поиск по search.json, см. search-fallback.js.
import { postJSON } from "./lib/post.js";

const root = document.body.dataset.root || "./";   // путь до корня сайта от текущей страницы
const base = new URL(root + "pagefind/", location.href).href;
const box = document.getElementById("search");
const hint = box.dataset.hint;
const label = "Поиск по вопросам";
// из лупы в шапке приходят по ссылке …#search — сразу ставим курсор в поле
const autofocus = location.hash === "#search";

// Запрос, по которому ничего не нашлось, анонимно уходит на сервер (без IP) — по ним пишем новые статьи.
const sent = new Set();
const reportMiss = (q) => {
  q = q.trim().toLowerCase();
  if (q.length < 3 || sent.has(q)) return;
  sent.add(q);
  postJSON("/api/miss", { q }).catch(() => {});
};

// разговорные слова ищем как официальные: «физра» и «физкультура» должны давать одну и ту же выдачу
const slang = [[/(^|[^а-яё])физ-?р[а-яё]*/gi, "$1физкультура"], [/(^|[^а-яё])общаг[а-яё]*/gi, "$1общежитие"], [/(^|[^а-яё])стипух[а-яё]*/gi, "$1стипендия"]];
const plain = (q) => slang.reduce((t, [re, to]) => t.replace(re, to), q);

// чипсы-подсказки (data-q): подставляют запрос в строку; до загрузки поиска — запоминаем последний
let setQuery = null, pending = null;
document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-q]");
  if (!chip) return;
  if (setQuery) setQuery(chip.dataset.q); else pending = chip.dataset.q;
});
const ready = (fn) => { setQuery = fn; if (pending) fn(pending); };

const mountPagefind = () => {
  box.textContent = "";
  const ui = new PagefindUI({
    element: "#search", bundlePath: base, showImages: false, showSubResults: false, resetStyles: false,
    translations: { placeholder: hint }, autofocus,
    processTerm: plain,
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
  const input = () => box.querySelector(".pagefind-ui__search-input");
  // у поля Pagefind только placeholder — даём ему имя для экранного диктора, как у поля-заглушки
  input()?.setAttribute("aria-label", label);
  ready((q) => { ui.triggerSearch(q); input()?.focus(); });
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

const script = document.createElement("script");
script.src = base + "pagefind-ui.js";
// Поле Pagefind рисуем только после его CSS: иначе на телефоне оно на миг выходит без стилей, выше на ~80 px,
// и всё под ним прыгает (CLS). CSS не загрузился — всё равно показываем поиск.
script.onload = () => {
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = base + "pagefind-ui.css";
  css.onload = css.onerror = mountPagefind;
  document.head.append(css);
};
script.onerror = async () => {
  const { mountFallback } = await import("./search-fallback.js");
  ready(await mountFallback({ box, root, hint, label, autofocus, plain, reportMiss }));
};
document.head.append(script);
