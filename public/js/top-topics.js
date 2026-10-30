(() => {
  // «Чаще всего спрашивают» на главной: вкладка темы показывает 10 самых частых вопросов этой темы
  const box = document.querySelector(".top-list");
  if (!box) return;
  const tabs = [...box.querySelectorAll(".tab")];
  const rows = [...box.querySelectorAll(".qlist li")];
  // смена вкладки: старый список уходит, новый въезжает снизу строка за строкой (стили — .is-leaving / .enter в theme.css)
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const swap = (list, update) => {
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
  };
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
    swap(box.querySelector(".qlist"), () => {
      let n = 0;
      rows.forEach((li) => {
        const show = (!t.dataset.topic || li.dataset.topic === t.dataset.topic) && n < 10;
        li.hidden = !show;
        n += show;
      });
    });
  }));
})();
