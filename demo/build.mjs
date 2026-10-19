// يبني نسخة تجريبية مستقلة من التطبيق للتحقق (ليس جزءاً من مشروع Next.js)
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import { compile } from "/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, process.env.DEMO_OUT || "demo/dist");
fs.mkdirSync(out, { recursive: true });
const NM = "/opt/npm-tools/node_modules";

const res = await build({
  entryPoints: [path.join(root, "demo/main.tsx")],
  bundle: true, format: "iife", minify: true, write: false, target: "es2020", jsx: "automatic",
  nodePaths: [NM],
  alias: {
    "@": root,
    zustand: path.join(root, "demo/shims/zustand.ts"),
    "zustand/middleware": path.join(root, "demo/shims/zustand.ts"),
    "framer-motion": path.join(root, "demo/shims/framer-motion.tsx"),
    "lucide-react": path.join(root, "demo/shims/lucide.ts"),
  },
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_PRICE_ONCE": "undefined", "process.env.NEXT_PUBLIC_PRICE_MONTHLY": "undefined", "process.env.NEXT_PUBLIC_ONCE_HOSTING_MONTHS": "undefined", "process.env.NEXT_PUBLIC_PAYMENT_NOTE": "undefined", "process.env.NEXT_PUBLIC_WHATSAPP": "undefined", "process.env.NEXT_PUBLIC_SUFRA_DEMO": JSON.stringify(process.env.PREVIEW_FLAG ?? "1") },
  logLevel: "warning",
});
const js = res.outputFiles[0].text;

// Tailwind v4: استخراج المرشحين من الملفات ثم توليد CSS
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.(tsx|ts)$/.test(e.name)) files.push(p);
});
walk(path.join(root, "components"));
const candidates = new Set();
for (const f of files) for (const src of [fs.readFileSync(f, "utf8")]) { for (const m of src.matchAll(/[^\s"'`{}()<>,;]+/g)) candidates.add(m[0]); for (const m of src.matchAll(/[^\s"'`{}<>]+/g)) candidates.add(m[0]); }
const css0 = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const compiler = await compile(css0, {
  base: root,
  loadStylesheet: async (id, base) => {
    const p = id === "tailwindcss" ? path.join(NM, "tailwindcss/index.css") : path.resolve(base, id);
    return { path: p, base: path.dirname(p), content: fs.readFileSync(p, "utf8") };
  },
});
const css = compiler.build([...candidates]);

const fontsLink = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Readex+Pro:wght@300;400;500;600;700&family=Tajawal:wght@400;500;700;800&display=swap";
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>سفرة</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${fontsLink}" crossorigin="anonymous" />
<style>
:root{--font-readex-pro:'Readex Pro';--font-tajawal:'Tajawal';--font-plex-arabic:'IBM Plex Sans Arabic';--font-inter:'Inter';--font-outfit:'Outfit';--font-jakarta:'Plus Jakarta Sans'}
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/g, "<\\/script")}</script>
</body>
</html>`;
fs.writeFileSync(path.join(out, "index.html"), html);
// نسخة صفحة المعاينة المنشورة: بدون هيكل المستند (يضيفه المضيف)
const artifact = `<title>سفرة</title>
<link rel="stylesheet" href="${fontsLink}" />
<style>
:root{color-scheme:light;--font-readex-pro:'Readex Pro';--font-tajawal:'Tajawal';--font-plex-arabic:'IBM Plex Sans Arabic';--font-inter:'Inter';--font-outfit:'Outfit';--font-jakarta:'Plus Jakarta Sans'}
${css}
</style>
<div id="root" dir="rtl" lang="ar"></div>
<script>document.documentElement.setAttribute("dir","rtl");document.documentElement.setAttribute("lang","ar");</script>
<script>${js.replace(/<\/script/g, "<\\/script")}</script>`;
fs.writeFileSync(path.join(out, "artifact.html"), artifact);
console.log("built", (html.length / 1024).toFixed(0) + "KB", "css", (css.length / 1024).toFixed(0) + "KB");
