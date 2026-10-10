// تخزين المنيو المنشور (الخادم فقط)
// - Upstash Redis عبر REST عند ضبط UPSTASH_REDIS_REST_URL و UPSTASH_REDIS_REST_TOKEN (مناسب لـ Vercel)
// - وإلا ملفات JSON محلية في MENU_STORAGE_DIR (افتراضياً .data/menus) للتطوير أو الخوادم الخاصة
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { MenuDoc } from "./types";

export interface StoredMenu { doc: MenuDoc; editKeyHash: string; createdAt: string; updatedAt: string }

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const SLUG_RE = /^[a-z0-9-]{3,48}$/;

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function read(slug: string): Promise<StoredMenu | null> {
  if (!SLUG_RE.test(slug)) return null;
  const r = redis();
  if (r) {
    const res = await fetch(`${r.url}/get/menu:${slug}`, { headers: { Authorization: `Bearer ${r.token}` }, cache: "no-store" });
    if (!res.ok) return null;
    const { result } = await res.json();
    return result ? (JSON.parse(result) as StoredMenu) : null;
  }
  try {
    const file = path.join(process.env.MENU_STORAGE_DIR || ".data/menus", `${slug}.json`);
    return JSON.parse(await fs.readFile(file, "utf8")) as StoredMenu;
  } catch {
    return null;
  }
}

async function write(slug: string, value: StoredMenu) {
  const body = JSON.stringify(value);
  const r = redis();
  if (r) {
    const res = await fetch(`${r.url}/set/menu:${slug}`, { method: "POST", headers: { Authorization: `Bearer ${r.token}` }, body });
    if (!res.ok) throw new Error(`Redis ${res.status}`);
    return;
  }
  const dir = process.env.MENU_STORAGE_DIR || ".data/menus";
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.json`), body, "utf8");
}

export function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return base.length >= 3 ? base : `menu-${base}`.replace(/-$/, "");
}

export async function getMenu(slug: string): Promise<MenuDoc | null> {
  return (await read(slug))?.doc ?? null;
}

/** حفظ جديد (يولّد slug ومفتاح تعديل) أو تحديث بمفتاح التعديل */
export async function saveMenu(doc: MenuDoc, slug?: string, editKey?: string): Promise<{ slug: string; editKey: string }> {
  const now = new Date().toISOString();
  if (slug && editKey) {
    const existing = await read(slug);
    if (existing) {
      if (existing.editKeyHash !== hash(editKey)) throw new Error("FORBIDDEN");
      await write(slug, { ...existing, doc: { ...doc, slug }, updatedAt: now });
      return { slug, editKey };
    }
  }
  const base = slugify(doc.venue.nameEn || "") || "menu";
  let candidate = base;
  for (let i = 0; i < 20 && (await read(candidate)); i++) candidate = `${base}-${crypto.randomBytes(2).toString("hex")}`;
  const key = crypto.randomBytes(18).toString("base64url");
  await write(candidate, { doc: { ...doc, slug: candidate }, editKeyHash: hash(key), createdAt: now, updatedAt: now });
  return { slug: candidate, editKey: key };
}
