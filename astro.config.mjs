import { defineConfig } from "astro/config";
import relativeLinks from "astro-relative-links";

// inlineStylesheets "never" и скрипты в public/js — под строгий CSP сервера (без inline).
// format "file": страницы вида q/<slug>.html; relativeLinks — ссылки относительные, сайт открывается из любого
// подкаталога и даже без сервера. На своём сервере можно вернуть format "directory" и убрать relativeLinks.
export default defineConfig({
  site: "https://faq.rozb.pw",
  build: { format: "file", inlineStylesheets: "never" },
  integrations: [relativeLinks()],
  // не встраивать мелкие файлы (куски шрифтов) как data: — CSP сервера разрешает шрифты только с самого сайта
  vite: { build: { assetsInlineLimit: 0 } },
});
