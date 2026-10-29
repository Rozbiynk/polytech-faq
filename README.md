# Сайт FAQ Московского Политеха — тестовая версия

Статичный сайт: Astro 5 + Markdown + Pagefind. Собирается в `dist/` — обычные HTML-файлы, раздаются любым веб-сервером
— живёт на https://faq.rozb.pw (t610, `/srv/rozb-faq`, Caddy `site_faq`, noindex).

## Как устроено

| Что | Где | Менять при смене дизайна? |
|---|---|---|
| Статьи (1 вопрос = 1 файл) | `src/content/articles/*.md` | нет |
| Схема статьи (поля frontmatter) | `src/content.config.ts` | нет |
| Название, этапы, темы, статусы | `src/site.config.ts` | нет |
| **Внешний вид** (цвета, шрифты, отступы) | `src/styles/theme.css` | да — главный файл |
| Разметка блоков | `src/components/*.astro`, `src/layouts/Base.astro` | по желанию |
| Страницы (главная, этап, статья, о проекте) | `src/pages/` | по желанию |

Новый дизайн = новый `theme.css` (и при необходимости новые компоненты). Статьи, адреса и поиск остаются.

## Статья
```yaml
title: "Когда начинается заселение в общежитие?"
stages: ["live"]            # apply, first-year, study, live, change, graduate — можно несколько
risk: 3                     # цена ошибки 1–3
status: "sourced"           # draft — из чата, sourced — по сайту вуза (не подтверждено), verified — проверено редактором
checked: 2026-10-27         # дата сверки/проверки
actual: "Приём 2026"        # к какому году относятся сроки (необязательно)
sources: []                 # [{title, url}] — официальные документы
people: 91                  # сколько человек спрашивали в чатах
aliases: [...]              # формулировки из чата — не видны, но по ним ищет поиск
tips: [...]                 # «что говорят студенты» — отдельно от фактов
```
Тема статьи (Поступление, Учёба и кампус, Деньги…) — не во frontmatter, а в `topicMap` в `src/site.config.ts`:
редактор /edit незнакомые поля не сохраняет. Статья, которой нет в `topicMap`, получает тему по первому этапу.

Под frontmatter — сам ответ в Markdown. Черновики делает `../gen_articles.py` из `../shortlist/shortlist.json`
(`--top 40`; существующие файлы не перезаписывает).

## Поиск
Pagefind индексирует собранный сайт (`pnpm build` = `astro build && pagefind --site dist`), ищет по тексту и `aliases`.
Если файлов Pagefind нет (превью в Claude Artifact их не раздаёт), включается простой поиск по `search.json`.

## Обратная связь
Кнопки «Помогла ли статья?» и «Сообщить об ошибке» шлют POST JSON на `data-feedback-url` в
`src/components/Feedback.astro` (`/api/feedback`), сервер пишет их в jsonl — см. `../server/README.md`.

## Правка статей и выкладка (с 2026-10-29)
Код — открытый репозиторий https://github.com/Rozbiynk/polytech-faq (корень — эта папка `site/`).
- **Редактор: https://faq.rozb.pw/edit** — свой, в стиле сайта: `src/pages/edit.astro`, `src/styles/editor.css`,
  `public/js/editor.js`. Вход по ссылке-приглашению (без GitHub-аккаунта); редактор отправляет правку на проверку,
  админ публикует. Сервер — `../editor/` (Rust, сервис `rozb-faq-editor` на rozb-server, `/api/ed/*`): черновики,
  приглашения, коммит в `main` от имени автора правки по deploy key. Поле `todo` («что раскрыть») видно только там.
- Запасной редактор для владельцев GitHub-аккаунтов — Decap CMS на `/decap` (`public/decap/`, вход через GitHub OAuth,
  `../server/oauth.py`). Можно удалить, если не нужен.
- **Выкладка сама:** push в `main` → GitHub Actions (`.github/workflows/deploy.yml`) собирает → ветка `deploy` →
  `rozb-faq-pull.timer` на сервере раз в минуту забирает её в `/srv/rozb-faq` (`../server/rozb-faq-pull`).
- Править локально: `git pull`, правка, `git commit`, `./deploy.sh` (проверит сборку и сделает push).
  Rsync с ПК больше не нужен — сервер перезапишет сайт веткой `deploy`.

## Команды
```
pnpm install
pnpm dev        # http://localhost:4321, поиск в dev не работает
pnpm build      # → dist/
pnpm preview    # посмотреть сборку
./deploy.sh     # проверить сборку и отправить в GitHub (выкладка сама)
```
**Gilroy** (заголовки) — по своей веб-лицензии, файлов в репозитории нет: `public/fonts/gilroy/` в `.gitignore`.
На сервере — `/srv/rozb-faq/fonts/gilroy/Gilroy-SemiBold.woff2` и `Gilroy-Bold.woff2` (см. `../server/README.md`),
локально — положить те же файлы в `public/fonts/gilroy/`. Без них заголовки в Montserrat.

CSP сервера строгий: без inline-скриптов и стилей, шрифты только свои (`@fontsource`), wasm для Pagefind разрешён.
Поэтому скрипты — в `public/js/`, CSS — файлами, `assetsInlineLimit: 0`.
Превью в Claude Artifact: скопировать `dist/` без `pagefind/` в `~/Общее/polytech-faq/preview/` и опубликовать.

## Запуск для всех (2026-10-27)
- Статьи переписаны по официальным страницам вуза скриптом `../tools/articles_2026.py` (один раз; дальше править .md).
  Старые адреса статей ведут на новые: `redirects` в `src/site.config.ts` → страницы-переадресации.
- Превью ссылок: `public/og.png`, теги в `Base.astro`. `robots.txt`, `sitemap.xml`, `404.html` собираются вместе с сайтом.
- Отзывы и 404 на сервере: `../server/README.md` (установлено 2026-10-27). Сайт пока закрыт от поисковиков заголовком Caddy.
