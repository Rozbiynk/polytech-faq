import { defineConfig } from "astro/config";
import relativeLinks from "astro-relative-links";

// Строгий CSP сервера (без inline): стили — файлами (inlineStylesheets "never"), скрипты из src/scripts тоже
// собираются файлами в /_astro (assetsInlineLimit 0 ниже — он же не даёт встраивать мелкие скрипты в страницу).
// format "file": страницы — файлы q/<slug>.html, Caddy отдаёт их по адресу без .html. relativeLinks — ссылки
// относительные, сайт открывается из любого подкаталога (превью). Только для своего сервера можно вернуть
// format "directory" и убрать relativeLinks.
export default defineConfig({
  site: "https://faq.rozb.pw",
  build: { format: "file", inlineStylesheets: "never" },
  integrations: [relativeLinks()],
  // не встраивать мелкие файлы (куски шрифтов, скрипты) в страницу и в CSS — CSP сервера разрешает их только файлами с самого сайта
  vite: { build: { assetsInlineLimit: 0 } },
});
