// POST JSON на свой сервер (/api/*); ответ — как у fetch
export const postJSON = (url, data) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
