// مخزن مفاتيح وقيم: Upstash Redis عبر REST (أو Vercel KV/Marketplace بنفس الصيغة)
// وفي التطوير المحلي بدون Redis: ملف JSON محلي (لا يُستخدم في الإنتاج)
import { promises as fs } from "node:fs";
import path from "node:path";

const isProd = () => process.env.NODE_ENV === "production";
function redisConf() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}
/** هل التخزين الدائم متاح؟ (Redis، أو ملف محلي خارج الإنتاج) */
export const kvAvailable = () => !!redisConf() || !isProd();
export const kvKind = () => (redisConf() ? "redis" : isProd() ? "none" : "file");

type Cmd = (string | number)[];

// ── بديل محلي للتطوير ──
interface Local { v: Record<string, unknown>; exp: Record<string, number> }
let local: Local | null = null;
const FILE = () => path.join(process.env.KV_LOCAL_DIR || ".data", "kv.json");
async function loadLocal(): Promise<Local> {
  if (local) return local;
  try { local = JSON.parse(await fs.readFile(FILE(), "utf8")); } catch { local = { v: {}, exp: {} }; }
  return local!;
}
async function saveLocal() {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(local));
}
const globRe = (p: string) => new RegExp("^" + p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");

async function localCmd(c: Cmd): Promise<unknown> {
  const db = await loadLocal();
  const now = Date.now();
  for (const [k, t] of Object.entries(db.exp)) if (t <= now) { delete db.v[k]; delete db.exp[k]; }
  const [op, key, ...a] = c.map(String);
  const op2 = op.toUpperCase();
  let r: unknown = null;
  const set = (v: unknown) => { db.v[key] = v; };
  switch (op2) {
    case "GET": r = typeof db.v[key] === "string" ? db.v[key] : null; break;
    case "SET": {
      set(a[0]); delete db.exp[key];
      const i = a.findIndex((x) => x.toUpperCase() === "EX");
      if (i >= 0) db.exp[key] = now + Number(a[i + 1]) * 1000;
      r = "OK"; break;
    }
    case "DEL": r = key in db.v ? 1 : 0; delete db.v[key]; delete db.exp[key]; break;
    case "EXPIRE": if (key in db.v) { db.exp[key] = now + Number(a[0]) * 1000; r = 1; } else r = 0; break;
    case "PERSIST": r = key in db.exp ? 1 : 0; delete db.exp[key]; break;
    case "TTL": r = !(key in db.v) ? -2 : key in db.exp ? Math.ceil((db.exp[key] - now) / 1000) : -1; break;
    case "INCRBY": case "INCR": { const n = Number(db.v[key] ?? 0) + (op2 === "INCR" ? 1 : Number(a[0])); set(String(n)); r = n; break; }
    case "SADD": { const s = new Set((db.v[key] as string[]) ?? []); a.forEach((x) => s.add(x)); set([...s]); r = 1; break; }
    case "SREM": { const s = new Set((db.v[key] as string[]) ?? []); a.forEach((x) => s.delete(x)); set([...s]); r = 1; break; }
    case "SMEMBERS": r = (db.v[key] as string[]) ?? []; break;
    case "ZADD": { const z = (db.v[key] as [number, string][]) ?? []; const m = a[1]; const f = z.filter(([, x]) => x !== m); f.push([Number(a[0]), m]); set(f); r = 1; break; }
    case "ZREM": { const z = (db.v[key] as [number, string][]) ?? []; set(z.filter(([, x]) => !a.includes(x))); r = 1; break; }
    case "ZREVRANGE": { const z = [...((db.v[key] as [number, string][]) ?? [])].sort((x, y) => y[0] - x[0]); r = z.slice(Number(a[0]), Number(a[1]) + 1).map(([, m]) => m); break; }
    case "ZCARD": r = ((db.v[key] as unknown[]) ?? []).length; break;
    case "KEYS": { const re = globRe(key); r = Object.keys(db.v).filter((k) => re.test(k)); break; }
    case "MGET": r = [key, ...a].map((k) => (typeof db.v[k] === "string" ? db.v[k] : null)); break;
    default: throw new Error(`local kv: unsupported ${op2}`);
  }
  if (!["GET", "SMEMBERS", "ZREVRANGE", "ZCARD", "KEYS", "MGET", "TTL"].includes(op2)) await saveLocal();
  return r;
}

export async function kv<T = unknown>(...c: Cmd): Promise<T> {
  const conf = redisConf();
  if (!conf) {
    if (isProd()) throw new Error("NO_KV");
    return (await localCmd(c)) as T;
  }
  const r = await fetch(conf.url, { method: "POST", headers: { Authorization: `Bearer ${conf.token}`, "Content-Type": "application/json" }, body: JSON.stringify(c.map(String)), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`KV ${r.status}: ${j.error ?? ""}`);
  return j.result as T;
}

export async function kvPipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (!cmds.length) return [];
  const conf = redisConf();
  if (!conf) {
    if (isProd()) throw new Error("NO_KV");
    const out: unknown[] = [];
    for (const c of cmds) out.push(await localCmd(c));
    return out;
  }
  const r = await fetch(`${conf.url}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${conf.token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmds.map((c) => c.map(String))), cache: "no-store" });
  const j = await r.json().catch(() => []);
  if (!r.ok || !Array.isArray(j)) throw new Error(`KV pipeline ${r.status}`);
  return j.map((x: { result?: unknown }) => x.result ?? null);
}

export const kvJson = {
  async get<T>(key: string): Promise<T | null> { const s = await kv<string | null>("GET", key); return s ? (JSON.parse(s) as T) : null; },
  async set(key: string, v: unknown, exSeconds?: number) { return exSeconds ? kv("SET", key, JSON.stringify(v), "EX", Math.max(1, Math.floor(exSeconds))) : kv("SET", key, JSON.stringify(v)); },
};
