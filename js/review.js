// Страница проверки: отметки активистов → POST /api/review, показ всех отметок из GET /api/reviews.
(() => {
  const nameInput = document.getElementById("reviewer");
  try { nameInput.value = localStorage.getItem("reviewer") || ""; } catch {}
  nameInput.addEventListener("change", () => { try { localStorage.setItem("reviewer", nameInput.value.trim()); } catch {} });

  const fmt = (t) => t.slice(8, 10) + "." + t.slice(5, 7);
  const show = (box, r) => {
    const li = document.createElement("li"), who = document.createElement("small"), text = document.createElement("div");
    who.textContent = `${r.name || "без имени"}, ${fmt(r.t)}: `;
    li.className = r.ok ? "ok" : "note";
    text.textContent = r.ok ? "всё верно" + (r.note ? `. ${r.note}` : "") : r.note;
    li.append(who, text);
    box.querySelector(".review__marks").append(li);
  };
  const boxes = Object.fromEntries([...document.querySelectorAll("[data-slug]")].map((b) => [b.dataset.slug, b]));

  fetch("/api/reviews").then((r) => (r.ok ? r.json() : [])).then((list) => {
    for (const r of list) if (boxes[r.slug]) show(boxes[r.slug], r);
  }).catch(() => {});

  const send = async (box, ok, note) => {
    const rec = { slug: box.dataset.slug, ok, note, name: nameInput.value.trim() };
    try {
      const r = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) });
      if (!r.ok) throw new Error(r.status);
      show(box, { ...rec, t: new Date().toISOString() });
      return true;
    } catch {
      const li = document.createElement("li"); li.className = "note";
      li.textContent = "Не получилось отправить. Попробуйте ещё раз чуть позже.";
      box.querySelector(".review__marks").append(li);
      return false;
    }
  };

  for (const box of Object.values(boxes)) {
    const form = box.querySelector("form");
    box.querySelector("[data-ok]")?.addEventListener("click", (e) => { e.target.disabled = true; send(box, true, "").then((ok) => { if (!ok) e.target.disabled = false; }); });
    box.querySelector("[data-note-toggle]")?.addEventListener("click", () => { form.hidden = !form.hidden; if (!form.hidden) form.note.focus(); });
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      if (await send(box, false, form.note.value.trim())) { form.reset(); if (box.dataset.slug !== "new") form.hidden = true; }
      btn.disabled = false;
    });
  }
})();
