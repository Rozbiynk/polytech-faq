(() => {
  // «Чаще всего спрашивают» на главной: вкладка темы показывает 10 самых частых вопросов этой темы
  const box = document.querySelector(".top-list");
  if (!box) return;
  const tabs = [...box.querySelectorAll(".tab")];
  const rows = [...box.querySelectorAll(".qlist li")];
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
    let n = 0;
    rows.forEach((li) => {
      const show = (!t.dataset.topic || li.dataset.topic === t.dataset.topic) && n < 10;
      li.hidden = !show;
      n += show;
    });
  }));
})();
