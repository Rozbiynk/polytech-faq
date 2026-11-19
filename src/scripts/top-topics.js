// «Чаще всего спрашивают» на главной: вкладка темы показывает 10 самых частых вопросов этой темы
import { swapList } from "./lib/swap-list.js";

const box = document.querySelector(".top-list");
const tabs = [...box.querySelectorAll(".tab")];
const rows = [...box.querySelectorAll(".qlist li")];

tabs.forEach((tab) => tab.addEventListener("click", () => {
  tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === tab)));
  const topic = tab.dataset.topic;
  swapList(box.querySelector(".qlist"), () => {
    let n = 0;
    rows.forEach((li) => {
      const show = (!topic || li.dataset.topic === topic) && n < 10;
      li.hidden = !show;
      n += show;
    });
  });
}));
