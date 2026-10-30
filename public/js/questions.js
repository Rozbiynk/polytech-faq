(() => {
  // Фильтр «Все вопросы» по этапу: ?stage=<slug> в адресе, чтобы ссылкой можно было поделиться.
  const chips = [...document.querySelectorAll(".filter__chip")];
  const rows = [...document.querySelectorAll(".allq .qlist li")];
  const groups = [...document.querySelectorAll(".topic")];
  const count = document.querySelector("[data-count]");
  const none = document.querySelector("[data-none]");
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

  const apply = (stage) => {
    if (!chips.some((c) => c.dataset.stage === stage)) stage = "";
    chips.forEach((c) => c.setAttribute("aria-current", String(c.dataset.stage === stage)));
    let n = 0;
    rows.forEach((li) => {
      const show = !stage || li.dataset.stages.split(" ").includes(stage);
      li.hidden = !show;
      n += show;
    });
    groups.forEach((g) => {
      const empty = !g.querySelector("li:not([hidden])");
      g.hidden = empty;
      document.querySelector(`[data-topic-link="${g.dataset.topic}"]`).hidden = empty;
    });
    count.textContent = n;
    none.hidden = n > 0;
  };

  chips.forEach((c) => c.addEventListener("click", (e) => {
    e.preventDefault();
    const stage = c.dataset.stage;
    const url = new URL(location.href);
    if (stage) url.searchParams.set("stage", stage); else url.searchParams.delete("stage");
    url.hash = "";
    history.replaceState(null, "", url);
    swap(document.querySelector(".allq"), () => apply(stage));
  }));
  apply(new URLSearchParams(location.search).get("stage") || "");
})();
