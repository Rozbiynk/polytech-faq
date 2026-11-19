// Страница-переадресация со старого адреса статьи (redirects в site.config.ts): сайт статичный, поэтому meta refresh.
// Адрес относительный — старая и новая страницы лежат в одном каталоге q/.
export const movedPage = (to: string, site: URL | undefined) => new Response(
  `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex">` +
  `<meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${new URL(`/q/${to}`, site)}">` +
  `<title>Статья переехала</title></head><body><p>Статья переехала: <a href="${to}">открыть</a>.</p></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } });
