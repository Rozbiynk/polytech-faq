// Смена содержимого списка (вкладка темы, фильтр этапа): старые строки уходят, update() меняет состав,
// новые въезжают снизу одна за другой. Стили — .is-leaving / .enter в theme.css.
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function swapList(list, update) {
  if (calm) return update();
  list.classList.add("is-leaving");
  setTimeout(() => {
    update();
    list.classList.remove("is-leaving");
    [...list.querySelectorAll("li:not([hidden])")].forEach((li, i) => {
      li.classList.remove("enter");
      li.style.setProperty("--i", Math.min(i, 12));
      void li.offsetWidth;   // перезапуск анимации
      li.classList.add("enter");
    });
  }, 200);
}
