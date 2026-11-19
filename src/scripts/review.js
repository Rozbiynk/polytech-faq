// Страница проверки: отметки активистов → POST /api/review, показ всех отметок из GET /api/reviews.
import { postJSON } from "./lib/post.js";

const nameInput = document.getElementById("reviewer");
try { nameInput.value = localStorage.getItem("reviewer") || ""; } catch {}
nameInput.addEventListener("change", () => { try { localStorage.setItem("reviewer", nameInput.value.trim()); } catch {} });

const boxes = Object.fromEntries([...document.querySelectorAll("[data-slug]")].map((b) => [b.dataset.slug, b]));
const dayMonth = (t) => t.slice(8, 10) + "." + t.slice(5, 7);
const addMark = (box, cls, ...content) => {
  const li = document.createElement("li");
  li.className = cls;
  li.append(...content);
  box.querySelector(".review__marks").append(li);
};
const show = (box, r) => {
  const who = document.createElement("small"), text = document.createElement("div");
  who.textContent = `${r.name || "без имени"}, ${dayMonth(r.t)}: `;
  text.textContent = r.ok ? "всё верно" + (r.note ? `. ${r.note}` : "") : r.note;
  addMark(box, r.ok ? "ok" : "note", who, text);
};

fetch("/api/reviews").then((r) => (r.ok ? r.json() : [])).then((list) => {
  for (const r of list) if (boxes[r.slug]) show(boxes[r.slug], r);
}).catch(() => {});

const send = async (box, ok, note) => {
  const rec = { slug: box.dataset.slug, ok, note, name: nameInput.value.trim() };
  try {
    const r = await postJSON("/api/review", rec);
    if (!r.ok) throw new Error(r.status);
    show(box, { ...rec, t: new Date().toISOString() });
    return true;
  } catch {
    addMark(box, "note", "Не получилось отправить. Попробуйте ещё раз чуть позже.");
    return false;
  }
};

for (const box of Object.values(boxes)) {
  const form = box.querySelector("form");
  box.querySelector("[data-ok]")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    if (!(await send(box, true, ""))) e.target.disabled = false;
  });
  box.querySelector("[data-note-toggle]")?.addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) form.note.focus(); });
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    if (await send(box, false, form.note.value.trim())) { form.reset(); if (box.dataset.slug !== "new") form.hidden = true; }
    btn.disabled = false;
  });
}
