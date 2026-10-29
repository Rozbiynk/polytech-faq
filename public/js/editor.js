// Редактор /edit: список вопросов, правка статьи с автосохранением черновика, очередь, проверка, отзывы, приглашения.
// Данные — /api/ed/* (editor/ — сервис на Rust на rozb-server). Без inline-скриптов и стилей: строгий CSP сайта.
(() => {
  const app = document.getElementById("app");
  const STAGES = JSON.parse(document.body.dataset.stages);
  const STAGE = Object.fromEntries(STAGES);
  const RISKS = JSON.parse(document.body.dataset.risks);
  const STATUS = { draft: "Черновик", sourced: "По сайту вуза", verified: "Проверено" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const date = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}` : "");
  const when = (t) => (t ? `${date(t)} ${t.slice(11, 16)}` : "");

  async function api(path, { method = "GET", body } = {}) {
    const r = await fetch("/api/ed/" + path, {
      method, credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({ error: "Сервер не ответил, попробуйте ещё раз" }));
    if (!r.ok) throw Object.assign(new Error(d.error || r.status), { status: r.status });
    return d;
  }

  let me = null, list = { articles: [], drafts: {} }, inbox = null;

  // ---------- оболочка ----------
  function shell() {
    app.innerHTML = `
      <header class="ed-bar"><a class="ed-logo" href="#/">Политех. <b>Редактор</b></a><button type="button" data-act="menu" aria-expanded="false">Меню</button></header>
      <nav class="ed-nav" aria-label="Разделы">
        <a class="ed-logo" href="#/">Политех.<b>Ответы</b><small>редактор ответов</small></a>
        <ul class="ed-menu"></ul>
        <div class="ed-work"></div>
        <div class="ed-me"></div>
      </nav>
      <main class="ed-main" id="main"><p class="ed-empty">Загрузка…</p></main>`;
    app.querySelector("[data-act=menu]").addEventListener("click", (e) => {
      const open = app.querySelector(".ed-nav").classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", open);
      e.currentTarget.textContent = open ? "Закрыть" : "Меню";
    });
    app.querySelector(".ed-nav").addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  }
  const closeMenu = () => {
    app.querySelector(".ed-nav")?.classList.remove("open");
    const b = app.querySelector("[data-act=menu]");
    if (b) { b.textContent = "Меню"; b.setAttribute("aria-expanded", "false"); }
  };

  function nav(route) {
    const drafts = Object.entries(list.drafts);
    const review = drafts.filter(([, d]) => d.state === "review").length;
    const queue = inbox ? inbox.misses.length + inbox.unhelpful.length : "";
    const items = [
      ["#/", "Вопросы", list.articles.length, route === "list" || route === "edit"],
      ["#/queue", "Очередь", queue, route === "queue"],
      ["#/review", "Проверка", review, route === "review", review > 0 && me.role === "admin"],
      ["#/feedback", "Обратная связь", inbox ? inbox.fixes.length : "", route === "feedback"],
    ];
    app.querySelector(".ed-menu").innerHTML = items.map(([h, t, n, cur, hot]) =>
      `<li><a href="${h}"${cur ? ' aria-current="page"' : ""}>${t}<span class="n${hot ? " hot" : ""}">${n || ""}</span></a></li>`).join("");
    const mine = drafts.filter(([, d]) => d.state === "work").sort((a, b) => (b[1].author === me.name) - (a[1].author === me.name) || b[1].updated.localeCompare(a[1].updated)).slice(0, 6);
    const cur = location.hash.startsWith("#/q/") ? decodeURIComponent(location.hash.slice(4)) : "";
    app.querySelector(".ed-work").innerHTML = mine.length
      ? `<h2>Сейчас в работе</h2><ul>${mine.map(([s, d]) => `<li><a href="#/q/${s}"${s === cur ? ' aria-current="page"' : ""}>${esc(d.title || s)}</a></li>`).join("")}</ul>` : "";
    app.querySelector(".ed-me").innerHTML = `<b>${esc(me.name)}</b><span>${me.role === "admin" ? "администратор" : "редактор"}</span>
      <a href="#/settings">${me.role === "admin" ? "Редакторы и приглашения" : "Настройки"}</a><a href="/index.html">Открыть сайт</a>`;
  }

  const main = () => document.getElementById("main");
  const titleOf = (slug) => list.articles.find((a) => a.slug === slug)?.title || list.drafts[slug]?.title || slug;

  // ---------- список вопросов ----------
  let filter = "all", query = "";
  function viewList() {
    main().innerHTML = `
      <div class="ed-head"><h1>Вопросы</h1><a class="btn primary" href="#/new">Новый вопрос</a></div>
      <div class="ed-search"><input type="search" placeholder="Найти вопрос" value="${esc(query)}" aria-label="Найти вопрос"></div>
      <div class="ed-filters" role="group" aria-label="Показать">${[["all", "Все"], ["work", "В работе"], ["draft", "Черновики"], ["sourced", "По сайту вуза"], ["verified", "Проверено"], ["risk", "Высокая цена ошибки"]]
        .map(([k, t]) => `<button type="button" class="ed-toggle" data-f="${k}" aria-pressed="${filter === k}">${t}</button>`).join("")}</div>
      <ul class="ed-list"></ul>`;
    const ul = main().querySelector(".ed-list");
    const rows = () => {
      const q = query.trim().toLowerCase();
      const arts = [...list.articles];
      for (const [slug, d] of Object.entries(list.drafts)) if (d.new) arts.push({ slug, title: d.title || slug, status: "draft", risk: 2, stages: [], people: 0, isNew: true });
      const shown = arts.filter((a) => (!q || a.title.toLowerCase().includes(q) || a.slug.includes(q)) &&
        (filter === "all" || (filter === "work" ? list.drafts[a.slug] : filter === "risk" ? a.risk === 3 : a.status === filter)));
      shown.sort((a, b) => !!list.drafts[b.slug] - !!list.drafts[a.slug] || (b.people || 0) - (a.people || 0));
      ul.innerHTML = shown.map((a) => {
        const d = list.drafts[a.slug];
        const meta = [a.stages.map((s) => STAGE[s]).join(", "), a.people ? `спрашивали ${a.people}` : "", a.checked ? `сверено ${date(a.checked)}` : "", a.isNew ? "новая" : ""].filter(Boolean).join(" · ");
        return `<li><a class="row" href="#/q/${a.slug}"><strong>${esc(a.title)}</strong><span class="meta">${esc(meta)}</span>
          <span class="side">${d ? `<span class="tag ${d.state}">${d.state === "review" ? "на проверке" : "в работе"} · ${esc(d.author)}</span>` : ""}
          ${a.risk === 3 ? `<span class="tag risk3">важно</span>` : ""}<span class="tag ${a.status}">${STATUS[a.status] || ""}</span></span></a></li>`;
      }).join("") || `<li class="row ed-hint">Ничего не нашлось. <a href="#/new?title=${encodeURIComponent(query)}">Создать такой вопрос</a></li>`;
    };
    rows();
    main().querySelector("input").addEventListener("input", (e) => { query = e.target.value; rows(); });
    main().querySelector(".ed-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]"); if (!b) return;
      filter = b.dataset.f;
      main().querySelectorAll(".ed-filters button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      rows();
    });
  }

  // ---------- статья ----------
  let ed = null, saveTimer = null;

  // транслитерация заголовка в адрес: «Как получить матпомощь?» → kak-poluchit-matpomoshch
  const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const slugify = (t) => t.toLowerCase().split("").map((c) => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).slice(0, 6).join("-");
  const validSlug = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 80;

  async function viewEdit(slug, params) {
    main().innerHTML = `<p class="ed-empty">Загрузка…</p>`;
    if (slug) {
      let d;
      try { d = await api("article/" + slug); } catch (e) { main().innerHTML = `<p class="ed-err">${esc(e.message)}</p>`; return; }
      const src = d.draft ? d.draft.fields : d.fields;
      const body = d.draft ? d.draft.body : d.body;
      ed = { slug, exists: d.exists, base: d.draft ? d.draft.base : d.head, fields: structuredClone(src), draft: d.draft, history: d.history, people: d.fields.people, preview: false, dirty: false };
      ed.fields.slug = slug;
      splitBody(body);
    } else {
      const title = params.get("title") || params.get("q") || "";
      ed = { slug: "", exists: false, base: "", fields: { title, stages: [], risk: 2, status: "draft", sources: [], aliases: params.get("q") ? [params.get("q")] : [], tips: [], todo: [] }, draft: null, history: [], preview: false, dirty: false, autoslug: true };
      ed.fields.slug = slugify(title);
      splitBody("");
    }
    for (const k of ["stages", "sources", "aliases", "tips", "todo"]) ed.fields[k] ??= [];
    renderEdit();
  }

  // короткий ответ — первый абзац текста, остальное — «подробно»
  function splitBody(body) {
    const i = body.indexOf("\n\n");
    const first = i < 0 ? body : body.slice(0, i);
    const isPara = first && !/^(\s*[-*]\s|\s*\d+\.\s|#|\|)/.test(first);
    ed.short = isPara ? first.trim() : "";
    ed.details = (isPara ? (i < 0 ? "" : body.slice(i + 2)) : body).trim();
  }
  const joinBody = () => [ed.short.trim(), ed.details.trim()].filter(Boolean).join("\n\n");

  function sideHTML() {
    const f = ed.fields;
    const log = [...(ed.draft?.log || []).map((l) => ({ t: l.t, what: `${l.what} — ${l.who}` })).reverse(),
      ...ed.history.map((h) => ({ t: h.t, what: h.msg.replace(/^(Правка|Новая статья): [a-z0-9-]+ /, "Опубликовано ").replace(/^Сайт FAQ.*/, "Первая версия") + (h.who && !h.msg.includes(h.who) ? ` — ${h.who}` : "") }))];
    return `
      <section><h2>Параметры</h2>
        <div class="ed-field"><span>Этапы</span><div class="ed-toggles">${STAGES.map(([s, t]) => `<button type="button" class="ed-toggle" data-stage="${s}" aria-pressed="${f.stages.includes(s)}">${t}</button>`).join("")}</div></div>
        <div class="ed-field"><span>Цена ошибки</span><div class="ed-toggles">${[1, 2, 3].map((r) => `<button type="button" class="ed-toggle" data-risk="${r}" aria-pressed="${f.risk === r}">${RISKS[r]}</button>`).join("")}</div></div>
        ${ed.exists ? "" : `<label class="ed-field"><span>Адрес статьи</span><input type="text" data-f="slug" value="${esc(f.slug)}" inputmode="url" autocapitalize="off" spellcheck="false" ${ed.draft ? "disabled" : ""}>
          <small class="ed-hint">faq.rozb.pw/q/<b>${esc(f.slug || "…")}</b> — латиница через дефис${ed.draft ? ", уже не меняется" : ""}</small></label>`}
      </section>
      <section><h2>Проверка информации</h2>
        <label class="ed-field"><span>Статус</span><select data-f="status">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}"${f.status === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <p class="ed-hint">«Проверено» — только если сверили с официальным источником.${f.sources.length ? "" : " Сначала добавьте источник."}</p>
        <label class="ed-field"><span>Дата сверки</span><input type="date" data-f="checked" value="${esc(f.checked || "")}"></label>
        <label class="ed-field"><span>Сроки относятся к</span><input type="text" data-f="actual" value="${esc(f.actual || "")}" placeholder="Приём 2026"></label>
      </section>
      <section><h2>Поисковые формулировки</h2>
        <p class="ed-hint">Как ещё спрашивают — на сайте не видно, по этим словам работает поиск.</p>
        <div class="ed-chips">${f.aliases.slice(0, ed.allAliases ? undefined : 8).map((a, i) => `<span>${esc(a)}<button type="button" class="ed-x" data-del="aliases" data-i="${i}" aria-label="Убрать">×</button></span>`).join("")}</div>
        ${f.aliases.length > 8 && !ed.allAliases ? `<button type="button" class="ed-add" data-more>Показать все (${f.aliases.length})</button>` : ""}
        <input type="text" data-alias placeholder="Добавить и нажать Enter" enterkeyhint="done">
        ${ed.people ? `<p class="ed-hint">В чатах спрашивали ${ed.people} человек.</p>` : ""}
      </section>
      <section><h2>История изменений</h2>
        <ul class="ed-hist">${log.map((l) => `<li><span>${esc(l.what)}</span><time>${when(l.t)}</time></li>`).join("") || `<li><span class="ed-hint">Пока пусто</span></li>`}</ul>
        ${ed.draft ? `<button type="button" class="ed-add" data-act="discard">Удалить черновик</button>` : ""}
      </section>`;
  }

  const tools = (target) => `<div class="ed-tools" data-target="${target}" role="toolbar" aria-label="Оформление">
    <button type="button" data-md="b" aria-label="Жирный">Ж</button><button type="button" data-md="i" aria-label="Курсив"><i>К</i></button>
    <button type="button" data-md="link" aria-label="Ссылка">🔗</button><button type="button" data-md="ul" aria-label="Список">•</button><button type="button" data-md="ol" aria-label="Нумерованный список">1.</button></div>`;

  function renderEdit() {
    const f = ed.fields, admin = me.role === "admin", st = ed.draft?.state;
    const primary = admin ? `<button type="button" class="btn primary" data-act="publish">Опубликовать</button>`
      : st === "review" ? `<button type="button" class="btn primary" disabled>На проверке</button>` : `<button type="button" class="btn primary" data-act="submit">На проверку →</button>`;
    main().innerHTML = `
      <div class="ed-top"><a class="back" href="#/">← <span>Все вопросы</span></a><span class="ed-saved" aria-live="polite">${ed.draft ? "Черновик сохранён" : ed.exists ? "Опубликовано" : "Не сохранено"}</span>
        <button type="button" class="btn btn--quiet" data-act="preview">${ed.preview ? "Править" : "Предпросмотр"}</button>${primary}</div>
      <div id="msg">${ed.draft && ed.draft.author !== me.name ? `<p class="ed-note">Черновик начал(а) ${esc(ed.draft.author)}, ${when(ed.draft.updated)}. Правки сохраняются в тот же черновик.</p>` : ""}${st === "review" && admin ? `<p class="ed-note">Правка ждёт проверки: прочитайте и нажмите «Опубликовать» или поправьте сами.</p>` : ""}</div>
      ${ed.preview ? previewHTML() : `
      <div class="ed-doc">
        <div class="ed-col ed-main-col">
          <div class="ed-sheet">
            <div class="ed-toggles"><span class="tag ${f.status}">${STATUS[f.status]}</span>${f.risk === 3 ? `<span class="tag risk3">цена ошибки: ${RISKS[3]}</span>` : ""}${ed.exists ? `<a class="tag" href="/q/${ed.slug}.html" target="_blank" rel="noopener">на сайте ↗</a>` : ""}</div>
            <textarea class="ed-title" data-f="title" rows="2" placeholder="Вопрос так, как его задают: «Когда заселение в общежитие?»" aria-label="Вопрос">${esc(f.title)}</textarea>
            <p class="ed-hint">${f.stages.map((s) => STAGE[s]).join(" / ") || "Этап не выбран"}</p>
          </div>
          <div class="ed-sheet"><h2>Короткий ответ</h2>${tools("short")}
            <textarea class="ed-short" data-b="short" placeholder="Главное в одном-трёх предложениях. Сроки — с годом." aria-label="Короткий ответ">${esc(ed.short)}</textarea></div>
          <div class="ed-sheet"><h2>Подробно</h2>${tools("details")}
            <textarea data-b="details" placeholder="Шаги, список документов, адреса. Пустая строка — новый абзац; «- » — пункт списка; «1. » — шаг." aria-label="Подробно">${esc(ed.details)}</textarea></div>
          <div class="ed-sheet"><h2>Что раскрыть в ответе</h2>
            <ul class="ed-checks">${f.todo.map((t, i) => `<li><input type="checkbox" data-todo="${i}"${t.done ? " checked" : ""} aria-label="Готово"><input type="text" data-todo-text="${i}" value="${esc(t.text)}" aria-label="Пункт"><button type="button" class="ed-x" data-del="todo" data-i="${i}" aria-label="Убрать">×</button></li>`).join("")}</ul>
            <button type="button" class="ed-add" data-add="todo">+ Добавить пункт</button><p class="ed-hint">Список для редакторов · на сайте не виден</p></div>
          <div class="ed-sheet"><h2>Источники</h2>
            <div class="ed-rows">${f.sources.map((s, i) => `<div><input type="text" data-src-title="${i}" value="${esc(s.title)}" placeholder="Название страницы" aria-label="Название"><input type="url" data-src-url="${i}" value="${esc(s.url)}" placeholder="https://mospolytech.ru/…" aria-label="Ссылка"><button type="button" class="ed-x" data-del="sources" data-i="${i}" aria-label="Убрать">×</button></div>`).join("")}</div>
            <button type="button" class="ed-add" data-add="sources">+ Добавить источник</button><p class="ed-hint">Официальные страницы вуза, приказы, правила приёма.</p></div>
          <div class="ed-sheet"><h2>Что говорят студенты</h2>
            <div class="ed-rows">${f.tips.map((t, i) => `<div><input type="text" data-tip="${i}" value="${esc(t)}" aria-label="Совет"><button type="button" class="ed-x" data-del="tips" data-i="${i}" aria-label="Убрать">×</button></div>`).join("")}</div>
            <button type="button" class="ed-add" data-add="tips">+ Добавить</button><p class="ed-hint">Опыт — пересказом, без имён и цитат из чатов.</p></div>
        </div>
        <aside class="ed-side" aria-label="Параметры статьи">${sideHTML()}</aside>
      </div>`}`;
    nav("edit");
  }

  // предпросмотр: тот же разбор Markdown, что нужен статьям (абзацы, списки, жирный, курсив, ссылки, таблицы)
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  function md(text) {
    return text.split(/\n\s*\n/).map((b) => {
      const lines = b.trim().split("\n");
      if (!lines[0]) return "";
      if (lines.every((l) => /^\s*[-*]\s/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s/, ""))}</li>`).join("")}</ul>`;
      if (lines.every((l) => /^\s*\d+\.\s/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\.\s/, ""))}</li>`).join("")}</ol>`;
      if (/^#{1,4}\s/.test(lines[0])) return `<h3>${inline(lines[0].replace(/^#+\s/, ""))}</h3>${lines.length > 1 ? `<p>${inline(lines.slice(1).join(" "))}</p>` : ""}`;
      if (lines.every((l) => l.trim().startsWith("|"))) {
        const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
        const body = lines.filter((l, i) => !(i === 1 && /^[\s|:-]+$/.test(l)));
        return `<table><tr>${cells(body[0]).map((c) => `<th>${c}</th>`).join("")}</tr>${body.slice(1).map((l) => `<tr>${cells(l).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    }).join("");
  }
  function previewHTML() {
    const f = ed.fields;
    return `<article class="ed-preview">
      <div class="ed-toggles">${f.stages.map((s) => `<span class="tag">${STAGE[s]}</span>`).join("")}<span class="tag ${f.status}">${STATUS[f.status]}</span></div>
      <h1>${esc(f.title || "Без вопроса")}</h1>
      <div class="answer">${md(joinBody()) || `<p class="ed-hint">Ответа пока нет</p>`}</div>
      ${f.sources.length ? `<h3>Источники</h3><ul>${f.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a></li>`).join("")}</ul>` : ""}
      ${f.tips.length ? `<h3>Что говорят студенты</h3><ul>${f.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      <p class="ed-hint">Примерно так статья будет выглядеть на сайте.</p></article>`;
  }

  // --- сохранение
  const saved = (text, bad) => { const s = main().querySelector(".ed-saved"); if (s) { s.textContent = text; s.classList.toggle("bad", !!bad); } };
  const msg = (html) => { const m = document.getElementById("msg"); if (m) m.innerHTML = html; };
  function changed() {
    ed.dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
    saved("Не сохранено");
  }
  async function save() {
    clearTimeout(saveTimer);
    if (!ed || !ed.dirty) return true;
    const slug = ed.slug || ed.fields.slug;
    if (!validSlug(slug)) { saved("Укажите адрес статьи, чтобы сохранить", true); return false; }
    if (!ed.slug && (list.articles.some((a) => a.slug === slug) || list.drafts[slug])) { saved("Такой адрес уже есть — придумайте другой", true); return false; }
    saved("Сохраняю…");
    const { slug: _, ...fields } = ed.fields;
    try {
      const r = await api("draft/" + slug, { method: "PUT", body: { fields, body: joinBody(), base: ed.base } });
      ed.dirty = false;
      if (!ed.draft) ed.draft = { author: me.name, state: "work", updated: r.updated, log: [{ t: r.updated, who: me.name, what: "Создан черновик" }] };
      ed.draft.updated = r.updated;
      list.drafts[slug] = { author: ed.draft.author, state: ed.draft.state, updated: r.updated, new: !ed.exists, title: ed.fields.title };
      saved("Сохранено " + r.updated.slice(11, 16));
      if (!ed.slug) { ed.slug = slug; history.replaceState(null, "", "#/q/" + slug); const inp = main().querySelector("[data-f=slug]"); if (inp) inp.disabled = true; }
      nav("edit");
      return true;
    } catch (e) {
      saved(e.status === 401 ? "Вход истёк — откройте ссылку-приглашение снова" : "Не сохранено: " + e.message, true);
      return false;
    }
  }

  async function act(name, extra = {}) {
    if (name === "preview") {
      ed.preview = !ed.preview; renderEdit(); return;
    }
    if (!(await save())) return;
    if (!ed.slug) { msg(`<p class="ed-err">Сначала заполните вопрос и адрес статьи.</p>`); return; }
    try {
      if (name === "submit") {
        await api("submit/" + ed.slug, { method: "POST", body: {} });
        ed.draft.state = "review"; list.drafts[ed.slug].state = "review";
        renderEdit(); msg(`<p class="ed-ok">Отправлено на проверку. Администратор посмотрит и опубликует.</p>`);
      } else if (name === "publish") {
        const r = await api("publish/" + ed.slug, { method: "POST", body: extra });
        delete list.drafts[ed.slug];
        await refresh();
        await viewEdit(ed.slug, new URLSearchParams());
        msg(`<p class="ed-ok">${r.same ? "Изменений не было — черновик закрыт." : `Опубликовано. На сайте через 2–3 минуты: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`}</p>`);
      } else if (name === "discard") {
        await api("discard/" + ed.slug, { method: "POST", body: {} });
        delete list.drafts[ed.slug];
        if (ed.exists) await viewEdit(ed.slug, new URLSearchParams()); else location.hash = "#/";
      }
    } catch (e) {
      if (e.status === 409) msg(`<p class="ed-err">${esc(e.message)} <button type="button" class="ed-add" data-act="force">Опубликовать поверх</button></p>`);
      else msg(`<p class="ed-err">${esc(e.message)}</p>`);
    }
  }

  // markdown-кнопки: обернуть выделение или начать строки со знака списка
  function mdTool(kind, ta) {
    const [a, b] = [ta.selectionStart, ta.selectionEnd], v = ta.value, sel = v.slice(a, b);
    let rep;
    if (kind === "b") rep = `**${sel || "жирный"}**`;
    else if (kind === "i") rep = `*${sel || "курсив"}*`;
    else if (kind === "link") rep = `[${sel || "текст ссылки"}](https://)`;
    else rep = (sel || "пункт").split("\n").map((l, i) => (kind === "ul" ? "- " : `${i + 1}. `) + l.replace(/^(\s*[-*]|\s*\d+\.)\s/, "")).join("\n");
    ta.setRangeText(rep, a, b, "select");
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  app.addEventListener("input", (e) => {
    if (!ed || !main()?.contains(e.target)) return;
    const t = e.target, f = ed.fields, d = t.dataset;
    if (d.f === "slug") { f.slug = t.value.trim().toLowerCase(); ed.autoslug = false; t.nextElementSibling.querySelector("b").textContent = f.slug || "…"; }
    else if (d.f === "title") {
      f.title = t.value;
      if (ed.autoslug && !ed.draft) { f.slug = slugify(t.value); const s = main().querySelector("[data-f=slug]"); if (s) { s.value = f.slug; s.nextElementSibling.querySelector("b").textContent = f.slug || "…"; } }
    }
    else if (d.f) f[d.f] = t.value;
    else if (d.b) ed[d.b] = t.value;
    else if (d.todoText !== undefined) f.todo[d.todoText].text = t.value;
    else if (d.todo !== undefined) f.todo[d.todo].done = t.checked;
    else if (d.srcTitle !== undefined) f.sources[d.srcTitle].title = t.value;
    else if (d.srcUrl !== undefined) f.sources[d.srcUrl].url = t.value.trim();
    else if (d.tip !== undefined) f.tips[d.tip] = t.value;
    else return;
    changed();
  });
  app.addEventListener("change", (e) => { if (e.target.dataset.f === "status" || e.target.type === "checkbox") renderKeep(); });
  app.addEventListener("keydown", (e) => {
    if (e.target.matches("[data-alias]") && e.key === "Enter") {
      e.preventDefault();
      const v = e.target.value.trim();
      if (v && !ed.fields.aliases.includes(v)) { ed.fields.aliases.push(v); changed(); renderKeep("[data-alias]"); }
    }
  });
  app.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !ed || !main().contains(b)) return;
    const f = ed.fields, d = b.dataset;
    if (d.md) return mdTool(d.md, main().querySelector(`[data-b=${b.parentElement.dataset.target}]`));
    if (d.act === "force") return act("publish", { force: true });
    if (b.hasAttribute("data-more")) { ed.allAliases = true; return renderKeep(); }
    if (d.act) return act(d.act);
    if (d.stage) { f.stages = f.stages.includes(d.stage) ? f.stages.filter((s) => s !== d.stage) : [...f.stages, d.stage]; }
    else if (d.risk) f.risk = +d.risk;
    else if (d.del) f[d.del].splice(+d.i, 1);
    else if (d.add === "todo") f.todo.push({ text: "", done: false });
    else if (d.add === "sources") f.sources.push({ title: "", url: "" });
    else if (d.add === "tips") f.tips.push("");
    else return;
    changed();
    renderKeep(d.add ? `[data-${d.add === "todo" ? "todo-text" : d.add === "sources" ? "src-title" : "tip"}="${f[d.add].length - 1}"]` : null);
  });
  // перерисовать статью, не теряя прокрутку; focusSel — куда поставить курсор
  function renderKeep(focusSel) {
    const y = scrollY, saveText = main().querySelector(".ed-saved")?.textContent, bad = main().querySelector(".ed-saved.bad"), m = document.getElementById("msg")?.innerHTML;
    renderEdit();
    saved(saveText, bad); msg(m);
    scrollTo(0, y);
    if (focusSel) main().querySelector(focusSel)?.focus();
  }
  addEventListener("beforeunload", (e) => { if (ed?.dirty) { save(); e.preventDefault(); } });

  // ---------- очередь, проверка, отзывы ----------
  async function needInbox() { if (!inbox) inbox = await api("inbox"); return inbox; }

  async function viewQueue() {
    const ib = await needInbox();
    main().innerHTML = `<div class="ed-head"><h1>Очередь</h1></div>
      <section class="ed-sheet"><h2>Искали и не нашли</h2><p class="ed-hint">Запросы поиска на сайте без результатов за 90 дней — кандидаты в новые вопросы.</p>
        <ul class="ed-list">${ib.misses.map((m) => `<li><a class="row" href="#/new?q=${encodeURIComponent(m.q)}"><strong>${esc(m.q)}</strong><span class="meta">${m.n} раз · последний ${date(m.last)}</span><span class="side"><span class="tag">создать вопрос</span></span></a></li>`).join("") || `<li class="row ed-hint">Пусто</li>`}</ul></section>
      <section class="ed-sheet"><h2>«Статья не помогла»</h2>
        <ul class="ed-list">${ib.unhelpful.map((u) => `<li><a class="row" href="#/q/${u.slug}"><strong>${esc(titleOf(u.slug))}</strong><span class="meta">не помогла: ${u.n}</span></a></li>`).join("") || `<li class="row ed-hint">Пусто</li>`}</ul></section>`;
    nav("queue");
  }

  async function viewReview() {
    const ib = await needInbox();
    const wait = Object.entries(list.drafts).filter(([, d]) => d.state === "review");
    main().innerHTML = `<div class="ed-head"><h1>Проверка</h1></div>
      <section class="ed-sheet"><h2>Правки ждут проверки</h2><p class="ed-hint">${me.role === "admin" ? "Откройте, прочитайте и нажмите «Опубликовать»." : "Их публикует администратор."}</p>
        <ul class="ed-list">${wait.map(([s, d]) => `<li><a class="row" href="#/q/${s}"><strong>${esc(d.title || s)}</strong><span class="meta">${esc(d.author)} · ${when(d.updated)}${d.new ? " · новая статья" : ""}</span></a></li>`).join("") || `<li class="row ed-hint">Нет правок на проверке</li>`}</ul></section>
      <section class="ed-sheet"><h2>Отметки активистов</h2><p class="ed-hint">Со страницы <a href="/proverka.html">proverka.html</a>: «всё верно» или замечание.</p>
        <ul class="ed-list">${ib.reviews.map((r) => `<li><a class="row" href="#/q/${r.slug}"><strong>${esc(titleOf(r.slug))}</strong><span class="meta">${esc(r.name || "без имени")} · ${date(r.t)}</span><span class="side"><span class="tag ${r.ok ? "verified" : "work"}">${r.ok ? "всё верно" : "замечание"}</span></span>${r.note ? `<span class="text">${esc(r.note)}</span>` : ""}</a></li>`).join("") || `<li class="row ed-hint">Пока нет</li>`}</ul></section>`;
    nav("review");
  }

  async function viewFeedback() {
    const ib = await needInbox();
    main().innerHTML = `<div class="ed-head"><h1>Обратная связь</h1></div>
      <section class="ed-sheet"><h2>Сообщения об ошибках</h2><p class="ed-hint">Кнопка «Сообщить об ошибке» под статьями, за 90 дней.</p>
        <ul class="ed-list">${ib.fixes.map((r) => `<li><a class="row" href="#/q/${r.slug}"><strong>${esc(titleOf(r.slug))}</strong><span class="meta">${when(r.t)}</span><span class="text">${esc(r.fix)}</span></a></li>`).join("") || `<li class="row ed-hint">Сообщений нет</li>`}</ul></section>`;
    nav("feedback");
  }

  // ---------- редакторы ----------
  async function viewSettings() {
    if (me.role !== "admin") {
      main().innerHTML = `<div class="ed-head"><h1>Настройки</h1></div><section class="ed-sheet"><p>Вы вошли как <b>${esc(me.name)}</b>, редактор. Правки отправляются на проверку администратору.</p><button type="button" class="btn" data-out>Выйти на этом устройстве</button></section>`;
    } else {
      const { editors } = await api("editors");
      main().innerHTML = `<div class="ed-head"><h1>Редакторы</h1></div>
        <section class="ed-sheet"><h2>Пригласить</h2><p class="ed-hint">Ссылка — это и есть вход: отправьте её человеку лично. Отозвать можно в списке ниже.</p>
          <div class="ed-rows"><div><input type="text" data-new-name placeholder="Имя, например Антон" aria-label="Имя"><select data-new-role aria-label="Роль"><option value="editor">Редактор — правки на проверку</option><option value="admin">Администратор — публикует сам</option></select></div></div>
          <button type="button" class="btn primary" data-invite>Создать ссылку</button><div data-link></div></section>
        <section class="ed-sheet"><h2>Кто может править</h2>
          <ul class="ed-list">${editors.map((e) => `<li><div class="row"><strong>${esc(e.name)}</strong><span class="meta">${e.role === "admin" ? "администратор" : "редактор"} · с ${date(e.created)}</span>
            <span class="side">${e.id === me.id ? `<span class="tag">это вы</span>` : `<button type="button" class="btn btn--quiet" data-revoke="${e.id}">Отозвать</button>`}</span></div></li>`).join("")}</ul></section>
        <section class="ed-sheet"><button type="button" class="btn" data-out>Выйти на этом устройстве</button></section>`;
    }
    nav("settings");
  }
  app.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-out")) { await api("logout", { method: "POST", body: {} }).catch(() => {}); location.replace("/edit"); }
    if (b.hasAttribute("data-invite")) {
      const name = main().querySelector("[data-new-name]").value.trim(), role = main().querySelector("[data-new-role]").value, box = main().querySelector("[data-link]");
      if (!name) { box.innerHTML = `<p class="ed-err">Напишите имя</p>`; return; }
      try {
        const r = await api("editors", { method: "POST", body: { name, role } });
        box.innerHTML = `<div class="ed-link"><b>Ссылка для ${esc(name)}</b><code>${esc(r.link)}</code><button type="button" class="btn" data-copy="${esc(r.link)}">Скопировать</button></div>`;
      } catch (err) { box.innerHTML = `<p class="ed-err">${esc(err.message)}</p>`; }
    }
    if (b.dataset.copy) { try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Скопировано"; } catch { b.textContent = "Скопируйте вручную"; } }
    if (b.dataset.revoke) {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Точно отозвать?"; return; }
      await api("editors/" + b.dataset.revoke, { method: "DELETE", body: {} }).catch((err) => alertBox(err.message));
      viewSettings();
    }
  });
  const alertBox = (text) => main().insertAdjacentHTML("afterbegin", `<p class="ed-err">${esc(text)}</p>`);

  // ---------- маршруты и вход ----------
  async function refresh() {
    list = await api("articles");
    inbox = null;
    needInbox().then(() => nav(current)).catch(() => {});
  }
  let current = "list";
  async function route() {
    if (ed?.dirty) await save();
    closeMenu();
    const h = location.hash.slice(1) || "/";
    const [path, qs] = h.split("?");
    const params = new URLSearchParams(qs || "");
    scrollTo(0, 0);
    try {
      if (path.startsWith("/q/")) { current = "edit"; await viewEdit(decodeURIComponent(path.slice(3)), params); return; }
      ed = null;
      if (path === "/new") { current = "edit"; await viewEdit("", params); return; }
      current = { "/queue": "queue", "/review": "review", "/feedback": "feedback", "/settings": "settings" }[path] || "list";
      await { queue: viewQueue, review: viewReview, feedback: viewFeedback, settings: viewSettings, list: async () => { viewList(); nav("list"); } }[current]();
    } catch (e) { main().innerHTML = `<p class="ed-err">${esc(e.message)}</p>`; }
  }

  function gate(text) {
    app.innerHTML = `<section class="ed-gate"><h1>Редактор ответов</h1><p>${text}</p><p class="ed-hint">Сайт: <a href="/index.html">faq.rozb.pw</a></p></section>`;
  }

  async function boot() {
    const invite = new URLSearchParams(location.search).get("invite");
    if (invite) {
      try { await api("join", { method: "POST", body: { key: invite } }); }
      catch (e) { gate(esc(e.message)); return; }
      history.replaceState(null, "", location.pathname + location.hash);
    }
    try { me = await api("me"); }
    catch (e) { gate(e.status === 401 ? "Чтобы править ответы, нужна ссылка-приглашение. Её даёт администратор сайта." : esc(e.message)); return; }
    shell();
    try { await refresh(); } catch (e) { main().innerHTML = `<p class="ed-err">${esc(e.message)}</p>`; return; }
    addEventListener("hashchange", route);
    route();
  }
  boot();
})();
