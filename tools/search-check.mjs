// Проверка выдачи поиска: по каждому запросу нужная статья должна быть первой.
//   pnpm build && pnpm check:search          — показать, что не на первом месте (код выхода 1, если такие есть)
//   node tools/search-check.mjs --all        — вся таблица
//   node tools/search-check.mjs общага лк    — выдача по своим запросам, без проверки
// Поиск тот же, что на сайте: индекс из dist/pagefind, замена разговорных слов и веса из search-tuning.js.
// Браузер не нужен — Pagefind запускается прямо в Node, файлы индекса отдаёт временный локальный сервер.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { plain, ranking } from "../src/scripts/lib/search-tuning.js";

// запрос → статьи, любая из которых должна быть первой
const cases = [
  // общежитие
  ["общага", ["dorm-how-to-get", "dorm-conditions"]],
  ["общежитие", ["dorm-how-to-get", "dorm-conditions"]],
  ["как получить общежитие", ["dorm-how-to-get"]],
  ["сколько стоит общежитие", ["dorm-conditions"]],
  ["общага цена", ["dorm-conditions"]],
  ["заселение", ["dorm-check-in-dates"]],
  ["когда заселение в общагу", ["dorm-check-in-dates"]],
  ["вторая волна", ["dorm-second-wave"]],
  ["справки для общежития", ["dorm-certificates"]],
  ["приоритеты общежитий", ["dorm-priorities"]],
  ["приоритеты", ["change-priorities", "dorm-priorities"]],
  ["комнаты в общежитии 4", ["dorm-4-rooms"]],
  ["общага 4", ["dorm-4-rooms"]],
  ["квд", ["dermatology-certificate"]],
  ["кожвен", ["dermatology-certificate"]],
  // поступление
  ["справка 086", ["medical-certificate-086"]],
  ["приказ о зачислении", ["enrollment-order"]],
  ["приказ", ["enrollment-order"]],
  ["согласие на зачисление", ["consent"]],
  ["проходной балл", ["passing-score"]],
  ["баллы", ["passing-score"]],
  ["бюджетные места", ["budget-places"]],
  ["бюджет", ["budget-places"]],
  ["платное", ["paid-admission", "tuition-payment"]],
  ["платка", ["paid-admission"]],
  ["стоимость обучения", ["paid-admission"]],
  ["сколько стоит обучение", ["paid-admission"]],
  ["цена обучения", ["paid-admission"]],
  ["оплата обучения", ["tuition-payment"]],
  ["списки", ["competition-lists"]],
  ["апелляция", ["appeal"]],
  ["вступительные", ["entrance-exams"]],
  ["вступиталки", ["entrance-exams"]],
  ["магистратура", ["masters-admission"]],
  ["мага", ["masters-admission"]],
  ["после колледжа", ["admission-after-college"]],
  ["бви", ["olympiad-bvi"]],
  ["олимпиада", ["olympiad-bvi"]],
  ["индивидуальные достижения", ["individual-achievements", "achievement-points-missing"]],
  ["льготы", ["admission-benefits"]],
  ["день открытых дверей", ["open-days"]],
  ["как подать документы", ["how-to-apply"]],
  ["приемка", ["contacts"]],
  // кабинеты и документы
  ["ЛК", ["applicant-account", "student-account"]],
  ["личный кабинет", ["applicant-account", "student-account"]],
  ["лк абитуриента", ["applicant-account"]],
  ["лк студента", ["student-account"]],
  ["личный кабинет студента", ["student-account"]],
  ["лмс", ["lms-login"]],
  ["пропуск", ["magnetic-pass"]],
  ["студенческий", ["student-id"]],
  ["студак", ["student-id"]],
  ["справка с места учёбы", ["study-certificates"]],
  ["мфц", ["university-mfc"]],
  ["социальная карта", ["student-social-card"]],
  ["аттестат", ["school-certificate-back"]],
  // деньги
  ["стипендия", ["scholarship"]],
  ["стипуха", ["scholarship"]],
  ["социальная стипендия", ["social-scholarship"]],
  ["соцстипендия", ["social-scholarship"]],
  ["повышенная стипендия", ["enhanced-scholarship"]],
  ["материальная помощь", ["financial-aid"]],
  ["матпомощь", ["financial-aid"]],
  // учёба
  ["физра", ["pe-credit", "pe-medical-group"]],
  ["зачёт по физкультуре", ["pe-credit"]],
  ["расписание", ["schedule"]],
  ["пары", ["class-duration"]],
  ["учебный план", ["study-plan"]],
  ["сессия", ["session-and-grades"]],
  ["оценки", ["session-and-grades"]],
  ["пересдача", ["exam-retakes"]],
  ["не сдал экзамен", ["exam-retakes"]],
  ["допса", ["exam-retakes"]],
  ["хвосты", ["exam-retakes"]],
  ["практика", ["internship"]],
  ["начало учёбы", ["first-year-start"]],
  ["когда начинается учёба", ["first-year-start"]],
  ["проектная деятельность", ["project-activity", "first-year-projects"]],
  ["пд", ["project-activity"]],
  // смена планов и выпуск
  ["академ", ["academic-leave"]],
  ["академический отпуск", ["academic-leave"]],
  ["отчисление", ["expulsion"]],
  ["отчислиться", ["expulsion"]],
  ["перевод", ["transfer-from-another-university", "change-program"]],
  ["перевестись на другое направление", ["change-program"]],
  ["диплом", ["before-graduation", "diploma-duplicate"]],
  ["дубликат", ["diploma-duplicate"]],
  // поддержка, кампус, возможности
  ["военная кафедра", ["army-deferment"]],
  ["военка", ["army-deferment"]],
  ["отсрочка", ["army-deferment"]],
  ["куратор", ["first-year-curator"]],
  ["староста", ["group-representative"]],
  ["психолог", ["psychological-support"]],
  ["профком", ["student-union"]],
  ["виза", ["international-office"]],
  ["куда обращаться", ["contacts"]],
  ["библиотека", ["library-locations", "library-borrowing"]],
  ["где поесть", ["campus-food"]],
  ["столовая", ["campus-food"]],
  ["столовка", ["campus-food"]],
  ["корпуса", ["campus-locations"]],
  ["как добраться", ["campus-locations"]],
  ["аудитория", ["find-classroom"]],
  ["вайфай", ["dorm-4-rooms", "dorm-conditions"]],
  ["работа", ["career-center"]],
  ["мерч", ["university-merch"]],
  ["секции", ["sports-club"]],
  ["волонтёрство", ["student-communities"]],
];

const dist = resolve(import.meta.dirname, "../dist");
const server = createServer(async (req, res) => {
  try { res.end(await readFile(join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname)))); }
  catch { res.statusCode = 404; res.end(); }
}).listen(0, "127.0.0.1");
await new Promise((ready) => server.on("listening", ready));

const pagefind = await import(pathToFileURL(join(dist, "pagefind/pagefind.js")).href);
await pagefind.options({ basePath: `http://127.0.0.1:${server.address().port}/pagefind/`, ranking });
await pagefind.init();

// первые статьи выдачи: [[адрес, счёт], …]
async function top(query, n = 4) {
  const { results } = await pagefind.search(plain(query));
  const rows = [];
  for (const r of results.slice(0, n)) rows.push([(await r.data()).url.replace(/^.*\/q\//, "").replace(/\.html$/, ""), r.score.toFixed(1)]);
  return { total: results.length, rows };
}

const args = process.argv.slice(2);
const own = args.filter((a) => !a.startsWith("--"));
let failed = 0;
if (own.length) {
  for (const q of own) { const { total, rows } = await top(q, 5); console.log(`${q.padEnd(30)} ${String(total).padStart(2)}  ${rows.map((r) => r.join(" ")).join(" · ") || "ничего"}`); }
} else {
  for (const [q, want] of cases) {
    const { total, rows } = await top(q);
    const ok = rows.length > 0 && want.includes(rows[0][0]);
    if (!ok) failed++;
    if (!ok || args.includes("--all")) console.log(`${ok ? "✓" : "✗"} ${q.padEnd(34)} ${total ? rows.map(([slug, score]) => `${want.includes(slug) ? `[${slug}]` : slug} ${score}`).join(" · ") : "ничего не найдено"}`);
  }
  console.log(`нужная статья первая: ${cases.length - failed} из ${cases.length}`);
}
server.close();
process.exit(failed ? 1 : 0);
