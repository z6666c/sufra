// بذور العشوائية (Seed Entropy): مولّد حتمي قابل لإعادة الإنتاج لكل طلب

export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** بذرة ديناميكية جديدة لكل طلب: عشوائية التشفير + زمن + بصمة المدخلات */
export function freshSeed(salt = ""): number {
  let r = 0;
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    r = a[0];
  } else {
    r = Math.floor(Math.random() * 2 ** 32);
  }
  return (r ^ hashString(salt + Date.now().toString(36))) >>> 0;
}

export const range = (rng: RNG, min: number, max: number) => min + rng() * (max - min);
export const int = (rng: RNG, min: number, max: number) => Math.floor(range(rng, min, max + 1));
export const pick = <T,>(rng: RNG, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
export const chance = (rng: RNG, p: number) => rng() < p;

/** اختيار عناصر مميزة بأوزان (بدون إعادة) */
export function weightedDistinct<T>(rng: RNG, items: { item: T; w: number }[], n: number): T[] {
  const pool = items.filter((i) => i.w > 0).map((i) => ({ ...i }));
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, i) => s + i.w, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}

export const uid = (rng?: RNG) =>
  (rng ? Math.floor(rng() * 2 ** 32) : Math.floor(Math.random() * 2 ** 32)).toString(36) +
  Date.now().toString(36).slice(-4);
