document.querySelectorAll(".feedback").forEach((box) => {
  const form = box.querySelector("form"), thanks = box.querySelector(".thanks");
  const say = (msg) => { thanks.textContent = msg; thanks.hidden = false; };
  // «Спасибо» — только когда сервер принял отзыв
  const send = async (payload, ok) => {
    const url = box.dataset.feedbackUrl;
    if (!url) return say("Отзывы пока не сохраняются.");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
                                   body: JSON.stringify({ slug: box.dataset.slug, ...payload }) });
      if (!r.ok) throw new Error(r.status);
      say(ok);
      return true;
    } catch {
      say("Не получилось отправить. Попробуйте ещё раз чуть позже.");
      return false;
    }
  };
  box.querySelectorAll("[data-vote]").forEach((b) =>
    b.addEventListener("click", () => send({ vote: b.dataset.vote }, "Спасибо, учтём.")));
  box.querySelector("[data-toggle]").addEventListener("click", () => { form.hidden = !form.hidden; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    if (await send({ fix: form.text.value }, "Спасибо, редактор проверит.")) { form.reset(); form.hidden = true; }
    btn.disabled = false;
  });
});
