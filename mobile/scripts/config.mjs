// يضبط إعدادات التطبيق من متغيرات GitHub (APP_URL و APP_ID و APP_NAME) قبل البناء — بدونها تُستخدم القيم الافتراضية
import fs from "node:fs";
const f = new URL("../capacitor.config.json", import.meta.url);
const c = JSON.parse(fs.readFileSync(f, "utf8"));
const url = (process.env.APP_URL || "").trim().replace(/\/$/, "");
if (url) {
  if (!/^https:\/\//.test(url)) throw new Error("APP_URL لازم يبدأ بـ https://");
  c.server.url = url;
  c.server.allowNavigation = [new URL(url).host];
  for (const p of ["www/index.html", "www/offline.html"]) {
    const pf = new URL(`../${p}`, import.meta.url);
    fs.writeFileSync(pf, fs.readFileSync(pf, "utf8").replace(/https:\/\/[a-z0-9.-]+(?=['"])/gi, url));
  }
}
if (process.env.APP_ID?.trim()) c.appId = process.env.APP_ID.trim();
if (process.env.APP_NAME?.trim()) c.appName = process.env.APP_NAME.trim();
fs.writeFileSync(f, JSON.stringify(c, null, 2));
console.log("app:", c.appId, c.appName, c.server.url);
