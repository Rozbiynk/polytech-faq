import { getCollection } from "astro:content";
import { site, stages } from "../site.config";

// Карта сайта для поисковиков: главная, «О проекте», этапы и все статьи.
export async function GET() {
  const articles = await getCollection("articles");
  const urls = ["/index.html", "/about.html", ...stages.map((s) => `/stage/${s.slug}.html`), ...articles.map((a) => `/q/${a.id}.html`)];
  const lastmod = (id: string) => articles.find((a) => `/q/${a.id}.html` === id)?.data.checked?.toISOString().slice(0, 10);
  const body = urls.map((u) => {
    const d = lastmod(u);
    return `<url><loc>${new URL(u, site.url).href}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`;
  }).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml" } });
}
