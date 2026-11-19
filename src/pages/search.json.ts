import { getArticles } from "../lib/articles";

// Маленький индекс для запасного поиска (когда Pagefind недоступен, scripts/search-fallback.js): заголовок + формулировки
// из чата. Порядок — общий порядок сайта: при равном совпадении выше то, о чём спрашивали чаще.
export async function GET() {
  const items = (await getArticles()).map((a) => ({
    id: a.id, title: a.data.title, status: a.data.status, risk: a.data.risk, text: a.data.aliases.join(" "),
  }));
  return new Response(JSON.stringify(items));
}
