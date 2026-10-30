// Всё, что относится к названию и разделам, — здесь; дизайн — в src/styles/theme.css.
export const site = {
  url: "https://faq.rozb.pw",
  name: "Политех.Ответы",
  slogan: "Как поступить, выжить в общаге и выпуститься",
  note: "Неофициальная база знаний из студенческих чатов",
  tagline: "Неофициальная база ответов студентов Московского Политеха",
  searchHint: "Например: когда приказ о зачислении, справка 086/у…",
  hints: ["общага", "ЛК", "вторая волна"],   // чипсы под поиском: по нажатию подставляются в строку
  popular: ["dorm-check-in-dates", "change-priorities", "dorm-certificates"],
};

// Этапы — способ навигации, а не жёсткая рубрика: статья может быть в нескольких.
export const stages = [
  { slug: "apply", title: "Поступаю", desc: "Документы, баллы, приоритеты, зачисление" },
  { slug: "first-year", title: "Первый курс", desc: "Начало учёбы, пропуск, личный кабинет" },
  { slug: "study", title: "Учусь", desc: "Сессия, пересдачи, стипендия, физкультура" },
  { slug: "live", title: "Живу", desc: "Общежитие, справки, быт, деньги" },
  { slug: "change", title: "Меняю планы", desc: "Академ, перевод, отчисление" },
  { slug: "graduate", title: "Выпускаюсь", desc: "Практика, диплом, справки" },
] as const;

export const stageBySlug = Object.fromEntries(stages.map((s) => [s.slug, s]));

// Темы — вторая ось навигации («Все вопросы», главная, «← тема» в статье). У статьи одна тема.
export const topics = [
  { slug: "admission", title: "Поступление", desc: "Документы, экзамены, приоритеты, списки, зачисление" },
  { slug: "study", title: "Учёба и кампус", desc: "Пары, сессия, пересдачи, корпуса, библиотеки, еда" },
  { slug: "documents", title: "Документы и сервисы", desc: "Личный кабинет, пропуск, студенческий, справки" },
  { slug: "money", title: "Деньги", desc: "Стипендии, оплата обучения" },
  { slug: "dorm", title: "Общежитие", desc: "Заселение, справки, условия и цены" },
  { slug: "support", title: "Поддержка", desc: "Куратор, психолог, профком, отсрочка, куда обращаться" },
  { slug: "career", title: "Возможности", desc: "Проекты, наука, спорт, творчество, работа" },
  { slug: "change", title: "Смена планов и выпуск", desc: "Академ, перевод, отчисление, диплом" },
] as const;
export type TopicSlug = (typeof topics)[number]["slug"];
export const topicBySlug = Object.fromEntries(topics.map((t) => [t.slug, t]));

// Тема статьи — по имени файла. Новые статьи, которых здесь нет, получают тему по первому этапу (topicOf).
const topicMap: Record<string, TopicSlug> = {
  "academic-leave": "change", "change-program": "change", "expulsion": "change", "transfer-from-another-university": "change",
  "before-graduation": "change", "diploma-duplicate": "change", "school-certificate-back": "change",
  "first-year-start": "study", "schedule": "study", "study-plan": "study", "internship": "study",
  "applicant-account": "admission", "upload-passport-scan": "admission", "medical-certificate-086": "admission",
  "student-account": "documents", "student-id": "documents", "magnetic-pass": "documents", "study-certificates": "documents",
  "scholarship": "money", "tuition-payment": "money",
  "dermatology-certificate": "dorm",
  "army-deferment": "support", "contacts": "support",
  "career-center": "career", "project-activity": "career",
  // по справочнику первокурсника 2025
  "campus-food": "study", "campus-locations": "study", "class-duration": "study", "find-classroom": "study",
  "library-borrowing": "study", "library-locations": "study", "digital-libraries": "study", "group-representative": "study",
  "session-and-grades": "study", "exam-admission": "study", "exam-retakes": "study", "missed-exam": "study",
  "first-year-curator": "support", "psychological-support": "support", "international-office": "support", "student-union": "support",
  "lms-login": "documents", "university-mfc": "documents", "official-channels": "documents", "student-social-card": "documents",
  "enhanced-scholarship": "money", "social-scholarship": "money", "paid-student-scholarship": "money", "financial-aid": "money",
  "student-campus-office": "dorm",
  "competency-passport": "career", "first-year-projects": "career", "own-project": "career", "student-science": "career",
  "student-communities": "career", "creative-communities": "career", "sports-club": "career", "museums": "career", "university-merch": "career",
  "pe-credit": "study", "pe-medical-group": "study",
  "individual-achievements": "admission", "olympiad-bvi": "admission",
};
const topicByStage: Record<string, TopicSlug> = {
  apply: "admission", "first-year": "study", study: "study", live: "dorm", change: "change", graduate: "change",
};
export const topicOf = (id: string, stages: readonly string[]): TopicSlug =>
  topicMap[id] ?? (id.startsWith("dorm-") ? "dorm" : topicByStage[stages[0]] ?? "study");

export const statuses = {
  draft: { label: "Черновик", note: "Собрано из ответов в чатах и не проверено. Сверяйте с официальными источниками." },
  sourced: { label: "По сайту вуза", note: "Ответ составлен по официальным страницам университета — ссылки ниже. Правила и сроки меняются каждый год: перед важным шагом откройте источник." },
  verified: { label: "Проверено", note: "Проверено редактором по официальным источникам." },
} as const;

export const riskLabels = { 1: "мелочь", 2: "неудобно", 3: "можно потерять место или срок" } as const;

// Старые адреса статей → новые. По старым ссылкам из чатов собираются страницы-переадресации.
export const redirects: Record<string, string> = {
  "bally-v-moskovskom-politehe": "passing-score",
  "can-i-choose-check-in-date": "dorm-check-in-dates",
  "can-i-enroll-on-paid-study": "paid-admission",
  "can-i-get-admitted-with-a": "passing-score",
  "change-priority-directions": "change-priorities",
  "consequences-of-missing-documents-deadline": "dorm-certificates",
  "dorm-rooms-number-4": "dorm-4-rooms",
  "dormitory-admission-balance": "dorm-how-to-get",
  "dormitory-situation": "dorm-conditions",
  "gde-posmotret-konkursnye-spiski": "competition-lists",
  "how-to-access-entrant-dashboard": "applicant-account",
  "id-balls-not-credited-actions": "achievement-points-missing",
  "kak-podat-zayavlenie-na-apellyatsiyu": "appeal",
  "kakoye-napravlenie-v-moskovskom-politehe": "choose-program",
  "komu-obraschatsya-po-voprosu-perevoda-iz": "transfer-from-another-university",
  "konkurs-na-obshchezhitie": "dorm-how-to-get",
  "kuda-podavat-dokumenty-pri-postuplenii-v": "how-to-apply",
  "kuda-prikrepliat-spravki": "dorm-certificates",
  "obshazhitie-conditions": "dorm-conditions",
  "passport-requirements-registration-exam": "exam-passport",
  "postuplenie-lgoty": "admission-benefits",
  "postuplenie-posle-spo": "admission-after-college",
  "postuplenie-v-magistraturu": "masters-admission",
  "priorities-for-dormitory": "dorm-priorities",
  "priority-dorm-settings": "dorm-priorities",
  "prokhodnoy-ball-dlya-postupleniya": "passing-score",
  "scan-passport-attachment": "upload-passport-scan",
  "second-wave-application-dates": "dorm-second-wave",
  "skin-dispensary-medical-certificate-doctor": "dermatology-certificate",
  "spravki-deistvuet-do-kakogo-chisla": "dorm-certificates",
  "student-portal-location": "student-account",
  "vuc-access-requirements": "army-deferment",
  "when-are-final-lists-published": "competition-lists",
  "when-does-study-start-for-first": "first-year-start",
  "when-to-choose-dormitory": "dorm-application-deadline",
  "when-will-the-enrollment-order-be": "enrollment-order",
  "where-to-attach-documents-for-dormitory": "dorm-certificates",
  "zachislenie-na-specialnost": "enrollment-order"
};
