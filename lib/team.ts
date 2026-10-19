// فريق الإدارة: حسابات إضافية يضيفها المالك (حساب ADMIN من متغيرات البيئة)
// - المالك ثابت ولا يمكن تعديله أو حذفه من اللوحة
// - مستويان: مشرف (manager) يدير العملاء والمدفوعات، ومشاهد (viewer) قراءة فقط
// - كلمات المرور مخزنة كبصمة PBKDF2-SHA256 مع ملح عشوائي
import { kv, kvJson, kvAvailable } from "./kv";
import { accounts } from "./auth";

const APP = "sufra";
export type TeamLevel = "manager" | "viewer";
export interface Member {
  username: string;
  name: string;
  level: TeamLevel;
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

const key = (u: string) => `${APP}:team:${u}`;
const SET = `${APP}:team`;
export const LEVEL_LABEL: Record<TeamLevel, string> = { manager: "مشرف", viewer: "مشاهد" };
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
export const toPublic = ({ salt: _s, hash: _h, ...m }: Member): MemberPublic => m;

export async function getMember(username: string): Promise<Member | null> {
  if (!kvAvailable()) return null;
  return kvJson.get<Member>(key(username.toLowerCase()));
}

export async function listMembers(): Promise<MemberPublic[]> {
  const ids = await kv<string[]>("SMEMBERS", SET);
  const rows = await Promise.all(ids.map((u) => getMember(u)));
  return rows.filter((m): m is Member => !!m).map(toPublic).sort((a, b) => a.createdAt - b.createdAt);
}

export function validatePassword(p: string) {
  return typeof p === "string" && p.length >= 8 && p.length <= 128 ? null : "كلمة المرور 8 أحرف على الأقل";
}

export async function addMember(input: { username: string; name?: string; password: string; level: TeamLevel }, by: string) {
  const username = String(input.username ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new Error("اسم المستخدم: 3 إلى 32 حرفاً إنجليزياً أو أرقاماً (ويُسمح بـ . _ -)");
  if (accounts().some((a) => a.username === username)) throw new Error("هذا الاسم محجوز لحساب المالك أو الديمو");
  const pe = validatePassword(input.password); if (pe) throw new Error(pe);
  if (await getMember(username)) throw new Error("اسم المستخدم مستخدم من قبل");
  if ((await kv<string[]>("SMEMBERS", SET)).length >= 20) throw new Error("الحد الأقصى 20 عضواً");
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const m: Member = {
    username, name: String(input.name ?? "").trim().slice(0, 60) || username, level: input.level === "viewer" ? "viewer" : "manager",
    salt, hash: await pbkdf2(input.password, salt), v: 1, createdAt: Date.now(), createdBy: by,
  };
  await kvJson.set(key(username), m);
  await kv("SADD", SET, username);
  return toPublic(m);
}

export async function updateMember(username: string, p: { name?: string; level?: TeamLevel; password?: string; disabled?: boolean }) {
  const m = await getMember(username);
  if (!m) return null;
  const next: Member = { ...m };
  let bump = false;
  if (typeof p.name === "string") next.name = p.name.trim().slice(0, 60) || m.username;
  if (p.level && p.level !== m.level) { next.level = p.level === "viewer" ? "viewer" : "manager"; bump = true; }
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
  const m = await getMember(username.trim());
  if (!m || m.disabled) {
    await pbkdf2(password, "timing-pad"); // زمن متقارب سواء وُجد الحساب أم لا
    return null;
  }
  if (!safeEq(await pbkdf2(password, m.salt), m.hash)) return null;
  await kvJson.set(key(m.username), { ...m, lastLoginAt: Date.now() });
  return m;
}
