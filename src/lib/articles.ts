import { getCollection, type CollectionEntry } from "astro:content";
import { topicFor, type TopicSlug } from "../site.config";

export type Article = CollectionEntry<"articles">;

// Один порядок на весь сайт: о чём спрашивали чаще — выше, при равенстве — где ошибка дороже.
// Последнее сравнение по имени файла — чтобы порядок не зависел от того, в каком порядке сборка прочитала файлы.
export const byPopularity = (a: Article, b: Article) =>
  (b.data.people ?? 0) - (a.data.people ?? 0) || b.data.risk - a.data.risk || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const getArticles = async () => (await getCollection("articles")).toSorted(byPopularity);

export const topicOf = (a: Article): TopicSlug => topicFor(a.id, a.data.stages);

// Похожие: та же тема важнее общих этапов; при равенстве — общий порядок сайта (all уже отсортирован).
export function relatedTo(a: Article, all: Article[], limit = 4) {
  const topic = topicOf(a);
  const score = (b: Article) =>
    (topicOf(b) === topic ? 2 : 0) + b.data.stages.filter((s) => a.data.stages.includes(s)).length;
  return all
    .filter((b) => b.id !== a.id)
    .map((b) => ({ b, score: score(b) }))
    .filter((x) => x.score > 0)
    .toSorted((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.b);
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const longDate = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
