// 404.html сервер отдаёт по любому адресу (/q/нет-такой), поэтому относительные ссылки astro-relative-links
// в ней ломаются. Возвращаем ссылки от корня.
import { readFileSync, writeFileSync } from "node:fs";
const f = "dist/404.html";
writeFileSync(f, readFileSync(f, "utf8").replace(/(href|src)="\.\//g, '$1="/').replace(/<link rel="canonical"[^>]*>/, ""));
