// فريق الإدارة: حسابات إضافية يضيفها المالك (حساب ADMIN من متغيرات البيئة)
// - المالك ثابت ولا يمكن تعديله أو حذفه من اللوحة
// - مستويان: مشرف (manager) يدير العملاء والمدفوعات، ومشاهد (viewer) قراءة فقط
// - كلمات المرور مخزنة كبصمة PBKDF2-SHA256 مع ملح عشوائي
import { kv, kvJson, kvAvailable, kvMemory } from "./kv";
import { accounts } from "./auth";
import { parseIdentifier } from "./customers";

const APP = "sufra";
export type TeamLevel = "manager" | "viewer" | "custom";
/** الصلاحيات التفصيلية — المشاهدة (نظرة عامة، الطلبات، العملاء، التصاميم، الاستخدام) متاحة لكل الفريق */
export type Perm = "payments" | "customers" | "designs" | "examples" | "finance" | "pricing" | "menus";
export const PERMS: { id: Perm; label: string; hint: string }[] = ([
  { id: "payments", label: "تفعيل الطلبات والمدفوعات", hint: "تفعيل مرة واحدة أو شهري، وتجديد، وإلغاء التفعيل" },
  { id: "customers", label: "إدارة العملاء", hint: "ملاحظات العملاء وتفعيل كل تصاميم العميل" },
  { id: "designs", label: "حذف التصاميم", hint: "حذف تصميم أي عميل" },
  { id: "menus", label: "حذف المنيوهات المنشورة", hint: "إيقاف رابط منيو منشور" },
  { id: "finance", label: "مشاهدة المالية", hint: "الإيراد والتكاليف وصافي الربح" },
  { id: "pricing", label: "الأسعار وأكواد الخصم", hint: "تعديل أسعار الباقات وإنشاء وإيقاف أكواد الخصم" },
  { id: "examples", label: "البيانات التجريبية", hint: "إضافة وحذف الأمثلة" },
] as { id: Perm; label: string; hint: string }[]).filter((p) => p.id !== "menus" || (APP as string) === "sufra");
export const LEVEL_PERMS: Record<Exclude<TeamLevel, "custom">, Perm[]> = {
  manager: ["payments", "customers", "designs", "menus", "examples"],
  viewer: [],
};
const ALL_PERMS = (): Perm[] => PERMS.map((p) => p.id);
export const cleanPerms = (x: unknown): Perm[] => (Array.isArray(x) ? x : []).filter((p): p is Perm => ALL_PERMS().includes(p as Perm));
export const effectivePerms = (m: Pick<Member, "level" | "perms">): Perm[] => (m.level === "custom" ? cleanPerms(m.perms) : LEVEL_PERMS[m.level].filter((p) => ALL_PERMS().includes(p)));
export interface Member {
  username: string;
  name: string;
  level: TeamLevel;
  /** للتحقق عند الدخول: يوصله رمز على الإيميل أو واتساب */
  email?: string;
  phone?: string;
  /** للصلاحيات المخصصة فقط */
  perms?: Perm[];
  salt: string;
  hash: string;
  /** يتغير عند تغيير كلمة المرور أو الصلاحية أو الإيقاف ← يُخرج الجلسات القديمة */
  v: number;
  disabled?: boolean;
  createdAt: number;
  createdBy: string;
  lastLoginAt?: number;
}
export type MemberPublic = Omit<Member, "salt" | "hash">;
const normLevel = (l: unknown): TeamLevel => (l === "viewer" || l === "custom" ? l : "manager");

const key = (u: string) => `${APP}:team:${u}`;
const SET = `${APP}:team`;
export const LEVEL_LABEL: Record<TeamLevel, string> = { manager: "مشرف", viewer: "مشاهد", custom: "مخصص" };
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
async function pbkdf2(password: string, salt: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 120_000 }, k, 256));
}
const safeEq = (a: string, b: string) => {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
export const toPublic = ({ salt: _s, hash: _h, ...m }: Member): MemberPublic & { effective: Perm[] } => ({ ...m, effective: effectivePerms(m) });

export async function getMember(username: string): Promise<Member | null> {
  if (!kvAvailable() && !kvMemory()) return null; // وضع العرض: للمعاينة فقط، الدخول بها متوقف
  return kvJson.get<Member>(key(username.toLowerCase()));
}

export async function listMembers(): Promise<MemberPublic[]> {
  const ids = await kv<string[]>("SMEMBERS", SET);
  const rows = await Promise.all(ids.map((u) => getMember(u)));
  return rows.filter((m): m is Member => !!m).map(toPublic).sort((a, b) => a.createdAt - b.createdAt);
}

/** الإيميل والجوال: واحد منهم على الأقل، ويُستخدم لرمز التحقق عند الدخول */
function cleanContact(email: unknown, phone: unknown, requireOne: boolean) {
  const out: { email?: string; phone?: string } = {};
  const e = String(email ?? "").trim(), p = String(phone ?? "").trim();
  if (e) { const i = parseIdentifier(e); if (i?.type !== "email") throw new Error("الإيميل غير صحيح"); out.email = i.value; }
  if (p) { const i = parseIdentifier(p); if (i?.type !== "phone") throw new Error("رقم الجوال غير صحيح، اكتبه مثل 05xxxxxxxx"); out.phone = i.value; }
  if (requireOne && !out.email && !out.phone) throw new Error("أضف إيميل الموظف أو رقم جواله عشان يوصله رمز التحقق عند الدخول");
  return out;
}

export function validatePassword(p: string) {
  return typeof p === "string" && p.length >= 8 && p.length <= 128 ? null : "كلمة المرور 8 أحرف على الأقل";
}

export async function addMember(input: { username: string; name?: string; password: string; level: TeamLevel; perms?: unknown; email?: unknown; phone?: unknown }, by: string) {
  const username = String(input.username ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new Error("اسم المستخدم: 3 إلى 32 حرفاً إنجليزياً أو أرقاماً (ويُسمح بـ . _ -)");
  if (accounts().some((a) => a.username === username)) throw new Error("هذا الاسم محجوز لحساب المالك أو الديمو");
  const pe = validatePassword(input.password); if (pe) throw new Error(pe);
  if (await getMember(username)) throw new Error("اسم المستخدم مستخدم من قبل");
  const contact = cleanContact(input.email, input.phone, true);
  if ((await kv<string[]>("SMEMBERS", SET)).length >= 20) throw new Error("الحد الأقصى 20 عضواً");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const m: Member = {
    username, name: String(input.name ?? "").trim().slice(0, 60) || username, level: normLevel(input.level), ...(normLevel(input.level) === "custom" ? { perms: cleanPerms(input.perms) } : {}),
    ...contact, salt, hash: await pbkdf2(input.password, salt), v: 1, createdAt: Date.now(), createdBy: by,
  };
  await kvJson.set(key(username), m);
  await kv("SADD", SET, username);
  return toPublic(m);
}

export async function updateMember(username: string, p: { name?: string; level?: TeamLevel; perms?: unknown; password?: string; disabled?: boolean; email?: unknown; phone?: unknown }) {
  const m = await getMember(username);
  if (!m) return null;
  const next: Member = { ...m };
  let bump = false;
  if (typeof p.name === "string") next.name = p.name.trim().slice(0, 60) || m.username;
  if (p.email !== undefined || p.phone !== undefined) {
    const c = cleanContact(p.email !== undefined ? p.email : m.email, p.phone !== undefined ? p.phone : m.phone, true);
    next.email = c.email; next.phone = c.phone;
    if (!c.email) delete next.email;
    if (!c.phone) delete next.phone;
  }
  if (p.level && p.level !== m.level) { next.level = normLevel(p.level); bump = true; }
  if (next.level === "custom" && p.perms !== undefined) next.perms = cleanPerms(p.perms);
  if (next.level !== "custom") delete next.perms;
  if (typeof p.disabled === "boolean" && p.disabled !== !!m.disabled) { next.disabled = p.disabled; bump = true; }
  if (p.password !== undefined) {
    const pe = validatePassword(p.password); if (pe) throw new Error(pe);
    next.salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    next.hash = await pbkdf2(p.password, next.salt);
    bump = true;
  }
  if (bump) next.v = m.v + 1;
  await kvJson.set(key(m.username), next);
  return toPublic(next);
}

export async function removeMember(username: string) {
  const u = username.toLowerCase();
  if (!(await getMember(u))) return false;
  await kv("DEL", key(u));
  await kv("SREM", SET, u);
  return true;
}

/** تحقق دخول عضو الفريق — يعيد العضو أو null */
export async function verifyMember(username: string, password: string): Promise<Member | null> {
  // دخول الأعضاء يحتاج قاعدة بيانات دائمة (في وضع العرض الحسابات مؤقتة)
  const m = kvAvailable() ? await getMember(username.trim()) : null;
  if (!m || m.disabled) {
    await pbkdf2(password, "timing-pad"); // زمن متقارب سواء وُجد الحساب أم لا
    return null;
  }
  if (!safeEq(await pbkdf2(password, m.salt), m.hash)) return null;
  return m;
}
// ── تحقق المالك (حساب الإدارة من البيئة): إيميله وجواله لرمز الدخول ──
// من متغيرات البيئة ADMIN_EMAIL / ADMIN_PHONE، أو من لوحة التحكم ← الفريق
const OWNER_KEY = `${APP}:owner-contact`;
export interface OwnerContact { email?: string; phone?: string; at?: number }
export async function getOwnerContact(): Promise<OwnerContact & { fromEnv: boolean }> {
  const env = cleanContact(process.env.ADMIN_EMAIL, process.env.ADMIN_PHONE, false);
  if (env.email || env.phone) return { ...env, fromEnv: true };
  const v = kvAvailable() ? await kvJson.get<OwnerContact>(OWNER_KEY).catch(() => null) : null;
  return { email: v?.email, phone: v?.phone, at: v?.at, fromEnv: false };
}
export async function setOwnerContact(email: unknown, phone: unknown) {
  const c = cleanContact(email, phone, false);
  if (!c.email && !c.phone) { await kv("DEL", OWNER_KEY); return {}; }
  const v: OwnerContact = { ...c, at: Date.now() };
  await kvJson.set(OWNER_KEY, v);
  return v;
}

export async function stampLogin(username: string) {
  const m = await getMember(username);
  if (m) await kvJson.set(key(m.username), { ...m, lastLoginAt: Date.now() });
}
