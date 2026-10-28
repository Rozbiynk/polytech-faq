import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Статья = один вопрос. Тело — проверенный ответ (или черновик), остальное — во frontmatter.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    url: z.string().optional(),                                  // = имя файла; нужно только редактору /edit
    stages: z.array(z.enum(["apply", "first-year", "study", "live", "change", "graduate"])).min(1),
    risk: z.number().int().min(1).max(3),
    status: z.enum(["draft", "sourced", "verified"]),
    checked: z.coerce.date().nullable(),                         // дата сверки (sourced) или проверки редактором (verified)
    actual: z.string().optional(),                               // к какому году относятся сроки, например «приём 2026»
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
    people: z.number().int().optional(),                         // сколько человек спрашивали в чатах
    aliases: z.array(z.string()).default([]),                    // формулировки из чата — только для поиска
    tips: z.array(z.string()).default([]),                       // советы студентов, отдельно от фактов
    todo: z.array(z.object({ text: z.string(), done: z.boolean() })).default([]), // «что раскрыть» — видно только в /edit
  }),
});

export const collections = { articles };
