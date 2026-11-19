import { site, stages } from "../site.config";
import { getArticles, isoDate } from "../lib/articles";

// Карта сайта для поисковиков: главная, «Все вопросы», «О проекте», этапы и все статьи (у статей — дата сверки).
export async function GET() {
  const articles = await getArticles();
  const urls: [path: string, lastmod?: string][] = [
    ["/"], ["/questions"], ["/about"],
    ...stages.map((s): [string] => [`/stage/${s.slug}`]),
    ...articles.map((a): [string, string?] => [`/q/${a.id}`, a.data.checked ? isoDate(a.data.checked) : undefined]),
  ];
  const body = urls.map(([path, lastmod]) =>
    `<url><loc>${new URL(path, site.url).href}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml" } });
}
