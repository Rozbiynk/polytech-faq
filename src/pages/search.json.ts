import { getCollection } from "astro:content";

// Маленький индекс для запасного поиска (когда Pagefind недоступен): заголовок + формулировки из чата.
export async function GET() {
  const items = (await getCollection("articles")).map((a) => ({
    id: a.id, title: a.data.title, status: a.data.status, risk: a.data.risk, text: a.data.aliases.join(" "),
  }));
  return new Response(JSON.stringify(items));
}
