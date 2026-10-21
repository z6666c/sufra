"use client";
// لوحة الإدارة الكاملة: نظرة عامة، العملاء، التصاميم، الاستخدام والتكاليف، الإعدادات
import * as React from "react";
import { PLANS as DEFAULT_PLANS, type PlanKind } from "@/lib/plans";

type Customer = { id: string; email?: string; phone?: string; name?: string; status: "trial" | "paid"; createdAt: number; lastLoginAt: number; trialEndsAt: number; note?: string; designs: number; example?: boolean };
type Paid = { plan: PlanKind; at: number; amount: number; until?: number | null; ref?: string; by?: string; coupon?: string } | null;
type ReqCoupon = { code: string; plan: PlanKind; base: number; price: number } | null;
/** الأسعار الحالية من «الأسعار والخصومات» (تتحدث بعد الحفظ) */
const PricesCtx = React.createContext<{ once: number; monthly: number }>({ once: DEFAULT_PLANS.once.price, monthly: DEFAULT_PLANS.monthly.price });
const usePrices = () => React.useContext(PricesCtx);
export type AdminMe = { username: string; owner: boolean; level: "owner" | "manager" | "viewer" | "custom"; perms?: string[] };
const MeCtx = React.createContext<AdminMe>({ username: "", owner: true, level: "owner" });
const useCan = (p: string) => { const m = React.useContext(MeCtx); return m.owner || !!m.perms?.includes(p); };
const useIsOwner = () => React.useContext(MeCtx).owner;
const LEVELS: Record<AdminMe["level"], string> = { owner: "المالك", manager: "مشرف", viewer: "مشاهد", custom: "صلاحيات مخصصة" };
type Design = { id: string; customerId: string; owner?: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; size: number; paid?: Paid; paymentRequestedAt?: number | null; requestedPlan?: PlanKind | null; requestedCoupon?: ReqCoupon; example?: boolean };
const isPaid = (d: Design) => !!d.paid && (!d.paid.until || d.paid.until > Date.now());
const planLabel = (k?: PlanKind | null) => (k === "monthly" ? "شهري" : "مرة واحدة");
type Overview = {
  kpis: { customers: number; paid: number; trial: number; signups7: number; designs: number; expiring7: number; aiCost30: number; revenue30: number; payments30: number; paidDesigns: number; pendingRequests: number; activeMonthly: number; mrr: number };
  series: { days: string[]; series: Record<string, number[]> };
  totals: Record<string, number>;
  cost: Record<string, number>;
};
export type SettingRow = { label: string; value: string; ok?: boolean; hint?: string };

const fmt = (n: number) => n.toLocaleString("ar-SA-u-nu-latn");
const date = (t: number) => new Date(t).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short" });
const left = (t: number | null) => (t ? Math.max(0, Math.ceil((t - Date.now()) / 86_400_000)) : null);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `خطأ ${r.status}`);
  return d as T;
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${tone === "warn" ? "text-amber-700" : "text-ink"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

/** عمود يومي لسلسلة واحدة — تلميح عند المرور، وجدول بديل للقراءة */
function DailyBars({ title, days, values, unit = "", span = "آخر 30 يوماً" }: { title: string; days: string[]; values: number[]; unit?: string; span?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...values);
  const W = 600, H = 140, pad = 18, bw = (W - pad * 2) / values.length;
  const total = values.reduce((a, b) => a + b, 0);
  const h = hover ?? values.length - 1;
  return (
    <figure className="rounded-2xl border border-line bg-white p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">
          {hover !== null ? <>{new Date(days[h]).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long" })}: <b className="text-ink">{fmt(values[h])}{unit}</b></> : <>{span}: <b className="text-ink">{fmt(total)}{unit}</b></>}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={`${title}: ${fmt(total)} خلال ${span}`} onMouseLeave={() => setHover(null)}>
        <line x1={pad} x2={W - pad} y1={H} y2={H} stroke="var(--color-line)" strokeWidth="1" />
        {values.map((v, i) => {
          // الأيام من اليمين لليسار لتطابق اتجاه القراءة العربية
          const x = W - pad - (i + 1) * bw;
          const bh = v ? Math.max(3, (v / max) * (H - 10)) : 0;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={0} width={bw} height={H} fill="transparent" />
              {bh > 0 && <path d={`M${x + 1} ${H}V${H - bh + 4}a4 4 0 0 1 4-4h${Math.max(0, bw - 10)}a4 4 0 0 1 4 4V${H}Z`} fill={hover === i ? "var(--color-ember)" : "var(--color-ink)"} opacity={hover === null || hover === i ? 1 : 0.55} />}
            </g>
          );
        })}
        {[0, values.length - 1].map((i) => (
          <text key={i} x={W - pad - (i + 0.5) * bw} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{date(new Date(days[i]).getTime())}</text>
        ))}
      </svg>
      <details className="mt-1 text-[11px] text-muted">
        <summary className="cursor-pointer">عرض كجدول</summary>
        <div className="mt-1 grid grid-cols-3 gap-x-3 sm:grid-cols-5">{days.map((d, i) => <span key={d}>{d.slice(5)}: {values[i]}</span>)}</div>
      </details>
    </figure>
  );
}

function OverviewTab() {
  const [d, setD] = React.useState<Overview | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { api<Overview>("/api/admin/overview").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Problem text={err} />;
  if (!d) return <Loading />;
  const s = d.series;
  const ai = s.days.map((_, i) => ["ai_logos", "ai_identity", "name_check", "menu_ai", "dish_photo"].reduce((a, m) => a + (s.series[m]?.[i] ?? 0), 0));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="الإيراد (30 يوماً)" value={`${fmt(d.kpis.revenue30)} ر.س`} sub={`${fmt(d.kpis.payments30)} عملية دفع`} />
        <Kpi label="الاشتراكات الشهرية النشطة" value={fmt(d.kpis.activeMonthly)} sub={`دخل شهري متكرر ${fmt(d.kpis.mrr)} ر.س`} />
        <Kpi label="طلبات تفعيل بانتظارك" value={fmt(d.kpis.pendingRequests)} sub="من تبويب «الطلبات والمدفوعات»" tone={d.kpis.pendingRequests ? "warn" : undefined} />
        <Kpi label="العملاء" value={fmt(d.kpis.customers)} sub={`${fmt(d.kpis.paid)} دفعوا · ${d.kpis.customers ? Math.round((d.kpis.paid / d.kpis.customers) * 100) : 0}% تحويل`} />
        <Kpi label="تسجيلات هذا الأسبوع" value={fmt(d.kpis.signups7)} />
        <Kpi label="التصاميم" value={fmt(d.kpis.designs)} sub={`${fmt(d.kpis.paidDesigns)} مدفوعة`} />
        <Kpi label="مسودات تُحذف خلال 7 أيام" value={fmt(d.kpis.expiring7)} sub="لم يكمل أصحابها الشراء" tone={d.kpis.expiring7 ? "warn" : undefined} />
        <Kpi label="تكلفة الذكاء (30 يوماً)" value={`${fmt(d.kpis.aiCost30)} ر.س`} sub="تقديرية حسب عدد العمليات" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars title="الإيراد اليومي" days={s.days} values={s.series.revenue ?? []} unit=" ر.س" />
        <DailyBars title="التسجيلات اليومية" days={s.days} values={s.series.signup ?? []} />
        <DailyBars title="عمليات الذكاء الاصطناعي اليومية" days={s.days} values={ai} />
        <DailyBars title="طلبات التفعيل اليومية" days={s.days} values={s.series.payment_request ?? []} />
      </div>
    </div>
  );
}

function CustomersTab() {
  const canWrite = useCan("customers"); const isOwner = useIsOwner();
  const [rows, setRows] = React.useState<Customer[] | null>(null);
  const [q, setQ] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api<{ customers: Customer[] }>(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((d) => setRows(d.customers)).catch((e) => setErr(e.message)); }, [q]);
  React.useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const act = async (id: string, body: object) => {
    setBusy(id);
    try { await api(`/api/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const del = async (id: string) => {
    setBusy(id);
    try { await api(`/api/admin/customers/${id}`, { method: "DELETE" }); setConfirm(null); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const csv = () => {
    if (!rows) return;
    const lines = [["المعرف", "البريد", "الجوال", "الحالة", "التسجيل", "آخر دخول", "التصاميم"], ...rows.map((c) => [c.id, c.email ?? "", c.phone ?? "", c.status === "paid" ? "دفع" : "لم يدفع", new Date(c.createdAt).toISOString(), new Date(c.lastLoginAt).toISOString(), String(c.designs)])];
    const blob = new Blob(["﻿" + lines.map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "customers.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالبريد أو الجوال" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40" />
        <button onClick={csv} disabled={!rows?.length} className="h-10 rounded-xl border border-line bg-white px-3 text-sm disabled:opacity-40">تصدير CSV</button>
      </div>
      {err && <Problem text={err} />}
      {!rows ? <Loading /> : !rows.length ? <Empty text="لا يوجد عملاء بعد." /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
              <th className="p-3 font-medium">العميل</th><th className="p-3 font-medium">الحالة</th><th className="p-3 font-medium">التصاميم</th><th className="p-3 font-medium">التسجيل</th><th className="p-3 font-medium">آخر دخول</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {rows.map((c) => {
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="p-3"><div className="font-medium" dir="ltr" style={{ textAlign: "right" }}>{c.email ?? c.phone}</div>{c.note && <div className="text-[11px] text-muted">{c.note}</div>}</td>
                    <td className="p-3">
                      {c.status === "paid" ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">دفع</span>
                        : <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-muted">لم يدفع بعد</span>}
                      {c.example && <span className="ms-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">مثال</span>}
                    </td>
                    <td className="p-3 font-latin">{c.designs}</td>
                    <td className="p-3 text-xs text-muted">{date(c.createdAt)}</td>
                    <td className="p-3 text-xs text-muted">{date(c.lastLoginAt)}</td>
                    <td className="p-3">
                      {canWrite && <div className="flex flex-wrap justify-end gap-1">
                        {c.status !== "paid" && c.designs > 0 && <button disabled={busy === c.id} onClick={() => act(c.id, { action: "paid" })} title="يفعّل كل تصاميم العميل بباقة المرة الواحدة" className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white">تفعيل كل تصاميمه</button>}
                        <button disabled={busy === c.id} onClick={() => { const n = prompt("ملاحظة عن العميل", c.note ?? ""); if (n !== null) act(c.id, { note: n }); }} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-ink/5">ملاحظة</button>
                        {isOwner && (confirm === c.id
                          ? <button disabled={busy === c.id} onClick={() => del(c.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white">تأكيد الحذف</button>
                          : <button onClick={() => setConfirm(c.id)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>)}
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DesignsTab() {
  const canWrite = useCan("designs");
  const [rows, setRows] = React.useState<Design[] | null>(null);
  const [err, setErr] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "paid" | "expiring">("all");
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const load = () => api<{ designs: Design[] }>("/api/admin/designs").then((d) => setRows(d.designs)).catch((e) => setErr(e.message));
  React.useEffect(() => { load(); }, []);
  const del = async (id: string) => { await api(`/api/admin/designs/${id}`, { method: "DELETE" }).catch((e) => setErr(e.message)); setConfirm(null); load(); };
  const list = (rows ?? []).filter((d) => filter === "all" ? true : filter === "paid" ? isPaid(d) : !isPaid(d) && d.expiresAt && left(d.expiresAt)! <= 7);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["all", "paid", "expiring"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs ${filter === f ? "bg-ink text-paper" : "border border-line bg-white"}`}>{f === "all" ? "كل التصاميم" : f === "paid" ? "المدفوعة" : "مسودات تنتهي قريباً"}</button>
        ))}
      </div>
      {err && <Problem text={err} />}
      {!rows ? <Loading /> : !list.length ? <Empty text="لا توجد تصاميم." /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
              <th className="p-3 font-medium">التصميم</th><th className="p-3 font-medium">العميل</th><th className="p-3 font-medium">الحالة</th><th className="p-3 font-medium">آخر تعديل</th><th className="p-3 font-medium">الحجم</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {list.map((d) => {
                const l = left(d.expiresAt);
                return (
                  <tr key={d.id} className="border-b border-line last:border-0">
                    <td className="p-3 font-medium">{d.title}</td>
                    <td className="p-3 text-xs" dir="ltr" style={{ textAlign: "right" }}>{d.owner}</td>
                    <td className="p-3 text-xs"><PayStatus d={d} /></td>
                    <td className="p-3 text-xs text-muted">{date(d.updatedAt)}</td>
                    <td className="p-3 font-latin text-xs text-muted">{Math.round(d.size / 1024)} KB</td>
                    <td className="p-3 text-left">
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <ActivateButtons d={d} onDone={load} />
                        {canWrite && (confirm === d.id ? <button onClick={() => del(d.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white">تأكيد الحذف</button>
                          : <button onClick={() => setConfirm(d.id)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PayStatus({ d }: { d: Design }) {
  if (isPaid(d)) return <span className="font-semibold text-emerald-700">مدفوع · {planLabel(d.paid!.plan)}{d.paid!.until ? ` حتى ${date(d.paid!.until)}` : " · دائم"}</span>;
  if (d.paid && d.paid.until && d.paid.until <= Date.now()) return <span className="font-semibold text-red-600">انتهى الاشتراك {date(d.paid.until)}</span>;
  if (d.paymentRequestedAt) return <span className="font-semibold text-amber-700">طلب تفعيل · {planLabel(d.requestedPlan)}</span>;
  const l = left(d.expiresAt);
  return <span className={l !== null && l <= 2 ? "text-red-600" : "text-muted"}>مسودة{l !== null ? ` · تُحذف بعد ${fmt(l)} يوم` : ""}</span>;
}

/** أزرار التفعيل: شهري أو مرة واحدة، وتجديد/إلغاء للمدفوع */
function ActivateButtons({ d, onDone }: { d: Design; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const canWrite = useCan("payments");
  const P = usePrices();
  const priceFor = (k: PlanKind) => (d.requestedCoupon && d.requestedCoupon.plan === k ? d.requestedCoupon.price : P[k]);
  const go = async (body: object, ask?: string) => {
    let ref: string | null = "";
    if (ask) { ref = prompt(ask, ""); if (ref === null) return; }
    setBusy(true);
    try { await api(`/api/admin/designs/${d.id}`, { method: "PATCH", body: JSON.stringify({ ...body, ref: ref || undefined }) }); onDone(); } finally { setBusy(false); }
  };
  if (!canWrite) return null;
  if (isPaid(d)) return (
    <>
      {d.paid!.plan === "monthly" && <button disabled={busy} onClick={() => go({ action: "paid", plan: "monthly" }, "رقم العملية للتجديد (اختياري)")} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">تجديد شهر</button>}
      <button disabled={busy} onClick={() => go({ action: "unpaid" })} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-ink/5">إلغاء التفعيل</button>
    </>
  );
  return (
    <>
      <button disabled={busy} onClick={() => go({ action: "paid", plan: "once" }, `رقم العملية أو التحويل (اختياري) — ${priceFor("once")} ر.س`)} className={`rounded-lg px-2 py-1 text-xs text-white ${d.requestedPlan === "once" ? "bg-emerald-600" : "bg-emerald-600/80"}`}>تفعيل مرة واحدة {priceFor("once")}</button>
      <button disabled={busy} onClick={() => go({ action: "paid", plan: "monthly" }, `رقم العملية أو التحويل (اختياري) — ${priceFor("monthly")} ر.س`)} className={`rounded-lg px-2 py-1 text-xs text-white ${d.requestedPlan === "monthly" ? "bg-sky-700" : "bg-sky-700/80"}`}>تفعيل شهري {priceFor("monthly")}</button>
    </>
  );
}

function PaymentsTab() {
  const P = usePrices();
  const [rows, setRows] = React.useState<Design[] | null>(null);
  const [err, setErr] = React.useState("");
  const load = React.useCallback(() => { api<{ designs: Design[] }>("/api/admin/designs").then((d) => setRows(d.designs)).catch((e) => setErr(e.message)); }, []);
  React.useEffect(() => { load(); }, [load]);
  if (err) return <Problem text={err} />;
  if (!rows) return <Loading />;
  const pending = rows.filter((d) => d.paymentRequestedAt && !isPaid(d)).sort((a, b) => (b.paymentRequestedAt ?? 0) - (a.paymentRequestedAt ?? 0));
  const paid = rows.filter((d) => d.paid).sort((a, b) => (b.paid!.at) - (a.paid!.at));
  const table = (list: Design[], kind: "pending" | "paid") => (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
          <th className="p-3 font-medium">التصميم</th><th className="p-3 font-medium">العميل</th>
          <th className="p-3 font-medium">{kind === "pending" ? "الباقة المطلوبة" : "الباقة"}</th><th className="p-3 font-medium">{kind === "pending" ? "وقت الطلب" : "المبلغ والمدة"}</th><th className="p-3" />
        </tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id} className="border-b border-line last:border-0">
              <td className="p-3 font-medium">{d.title}{d.example && <span className="ms-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">مثال</span>}<div className="font-latin text-[10.5px] font-normal tracking-wider text-muted" dir="ltr" style={{ textAlign: "right" }}>#{d.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}</div></td>
              <td className="p-3 text-xs" dir="ltr" style={{ textAlign: "right" }}>{d.owner}</td>
              <td className="p-3 text-xs">{kind === "pending" ? <>{planLabel(d.requestedPlan)} · {d.requestedCoupon ? <><s className="text-muted">{d.requestedCoupon.base}</s> {d.requestedCoupon.price} ر.س <span className="rounded bg-emerald-100 px-1 text-[10px] text-emerald-800" dir="ltr">{d.requestedCoupon.code}</span></> : `${d.requestedPlan === "monthly" ? P.monthly : P.once} ر.س`}</> : <PayStatus d={d} />}</td>
              <td className="p-3 text-xs text-muted">{kind === "pending" ? new Date(d.paymentRequestedAt!).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : `${fmt(d.paid!.amount)} ر.س · ${date(d.paid!.at)}${d.paid!.coupon ? ` · كود ${d.paid!.coupon}` : ""}${d.paid!.ref ? ` · ${d.paid!.ref}` : ""}${d.paid!.by ? ` · بواسطة ${d.paid!.by}` : ""}`}</td>
              <td className="p-3 text-left"><span className="inline-flex flex-wrap justify-end gap-1"><ActivateButtons d={d} onDone={load} /></span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
        حتى ربط بوابة الدفع: العميل يختار باقته ويشوف طرق السداد اللي حطيتها في «الأسعار والسداد»، ويكتب رقم الطلب (#) في التحويل، ويظهر طلبه هنا. بعد استلام المبلغ (تحويل بنكي مثلاً) اضغط «تفعيل» ليُفتح له التحميل{DEFAULT_PLANS.once.months ? " والنشر" : ""} فوراً. الشهري يمتد شهراً من تاريخ التفعيل ويُجدَّد بزر «تجديد شهر».
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold">بانتظار التفعيل ({fmt(pending.length)})</h3>
        {pending.length ? table(pending, "pending") : <Empty text="لا توجد طلبات حالياً." />}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">المدفوعات ({fmt(paid.length)})</h3>
        {paid.length ? table(paid, "paid") : <Empty text="لا توجد مدفوعات بعد." />}
      </section>
    </div>
  );
}

function genPassword() {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(14)), (x) => a[x % a.length]).join("");
}
type Perm = { id: string; label: string; hint: string };
type Member = { username: string; name: string; email?: string; phone?: string; level: "manager" | "viewer" | "custom"; perms?: string[]; effective: string[]; disabled?: boolean; createdAt: number; lastLoginAt?: number };
type TeamData = { owner: string; members: Member[]; perms: Perm[]; presets: Record<"manager" | "viewer", string[]> };
const ROLE_INFO: Record<Member["level"], string> = { manager: "مشرف", viewer: "مشاهد", custom: "مخصص" };

/** اختيار الدور والصلاحيات — المشرف والمشاهد قوالب جاهزة، والمخصص تختار فيه بنفسك */
function PermsEditor({ data, level, perms, onChange }: { data: TeamData; level: Member["level"]; perms: string[]; onChange: (l: Member["level"], p: string[]) => void }) {
  const active = level === "custom" ? perms : data.presets[level];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["manager", "viewer", "custom"] as Member["level"][]).map((l) => (
          <button type="button" key={l} onClick={() => onChange(l, l === "custom" ? (level === "custom" ? perms : data.presets[level as "manager" | "viewer"] ?? []) : [])}
            className={`rounded-full px-3 py-1.5 text-xs ${level === l ? "bg-ink text-paper" : "border border-line bg-white"}`}>
            {l === "manager" ? "مشرف (جاهز)" : l === "viewer" ? "مشاهد فقط" : "صلاحيات مخصصة"}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.perms.map((p) => {
          const on = active.includes(p.id);
          return (
            <label key={p.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${on ? "border-emerald-300 bg-emerald-50" : "border-line bg-white"} ${level !== "custom" ? "cursor-default opacity-80" : ""}`}>
              <input type="checkbox" className="mt-1" checked={on} disabled={level !== "custom"} onChange={(e) => onChange("custom", e.target.checked ? [...perms, p.id] : perms.filter((x) => x !== p.id))} />
              <span><span className="font-medium">{p.label}</span><span className="block text-[11px] text-muted">{p.hint}</span></span>
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-muted">كل الأعضاء يشوفون: نظرة عامة، والطلبات، والعملاء، والتصاميم، والاستخدام. وللمالك فقط: إدارة الفريق، وحذف العملاء، والإعدادات.{level !== "custom" ? " اختر «صلاحيات مخصصة» لتحديدها بنفسك." : ""}</p>
    </div>
  );
}

type OwnerC = { email?: string; phone?: string; fromEnv: boolean; active: boolean; canEmail: boolean; canPhone: boolean };
function OwnerVerify({ onChange }: { onChange?: () => void }) {
  const [c, setC] = React.useState<OwnerC | null>(null);
  const [f, setF] = React.useState({ email: "", phone: "" });
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { api<OwnerC>("/api/admin/owner-contact").then((d) => { setC(d); setF({ email: d.email ?? "", phone: d.phone ?? "" }); }).catch(() => {}); }, []);
  if (!c) return null;
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const d = await api<OwnerC>("/api/admin/owner-contact", { method: "PUT", body: JSON.stringify(f) });
      setC(d); onChange?.();
      setMsg({ ok: true, text: d.active ? "تم. من دخولك الجاي يوصلك رمز تحقق بعد كلمة المرور." : d.email || d.phone ? "انحفظت بياناتك، لكن الرمز ما يقدر يوصل لين تربط الإيميل أو واتساب في إعدادات الخادم." : "أوقفت التحقق بخطوتين لحسابك." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const inp = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40 disabled:bg-paper";
  return (
    <section className={`rounded-2xl border p-5 ${c.active ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">التحقق عند دخولك (المالك)</h3>
        {c.active ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">مفعّل</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">غير مفعّل</span>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">بعد كلمة المرور يوصلك رمز من 6 أرقام على واتساب (إذا أضفت جوالك) أو على إيميلك. حتى لو انكشفت كلمة مرورك، ما أحد يقدر يدخل بدون الرمز.</p>
      {c.fromEnv ? <p className="mt-3 text-xs">بياناتك مضبوطة من إعدادات الخادم (<span dir="ltr" className="font-latin">ADMIN_EMAIL / ADMIN_PHONE</span>): {c.phone && <span dir="ltr">{c.phone}</span>} {c.email && <span dir="ltr">{c.email}</span>}</p> : (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-xs text-muted">إيميلك<input type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@company.sa" className={inp} /></label>
          <label className="text-xs text-muted">رقم جوالك (واتساب)<input dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="05xxxxxxxx" className={inp + " font-latin"} /></label>
          <button disabled={busy} onClick={save} className="h-10 rounded-xl bg-ink px-4 text-sm text-paper">{busy ? "…" : "حفظ"}</button>
        </div>
      )}
      {!c.active && (c.email || c.phone) && <p className="mt-2 text-xs text-amber-800">الرمز ما يقدر يوصل الحين: {!c.canEmail && c.email ? "الإيميل ما انربط (RESEND_API_KEY). " : ""}{!c.canPhone && c.phone ? "واتساب ما انربط (WHATSAPP_TOKEN). " : ""}لين تربطه تدخل بكلمة المرور بس.</p>}
      {msg && <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</div>}
    </section>
  );
}

function TeamTab({ demo = false }: { demo?: boolean }) {
  const [data, setData] = React.useState<TeamData | null>(null);
  const [err, setErr] = React.useState("");
  const [form, setForm] = React.useState({ username: "", name: "", email: "", phone: "", password: genPassword(), level: "manager" as Member["level"], perms: [] as string[] });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ username: string; password: string } | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState<{ u: string; level: Member["level"]; perms: string[]; email: string; phone: string } | null>(null);
  const [ok, setOk] = React.useState("");
  const load = React.useCallback(() => { api<TeamData>("/api/admin/team").then(setData).catch((e) => setErr(e.message)); }, []);
  React.useEffect(() => { load(); }, [load]);
  const run = async (id: string, fn: () => Promise<unknown>, done = "") => {
    setBusy(id); setErr(""); setOk("");
    try { await fn(); if (done) setOk(done); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run("add", async () => {
      await api("/api/admin/team", { method: "POST", body: JSON.stringify(form) });
      setCreated({ username: form.username.trim().toLowerCase(), password: form.password });
      setForm({ username: "", name: "", email: "", phone: "", password: genPassword(), level: "manager", perms: [] });
    });
  };
  const patch = (u: string, body: object, done = "") => run(u, () => api(`/api/admin/team/${encodeURIComponent(u)}`, { method: "PATCH", body: JSON.stringify(body) }), done);
  const resetPw = (u: string) => {
    const pw = genPassword();
    run(u, async () => { await api(`/api/admin/team/${encodeURIComponent(u)}`, { method: "PATCH", body: JSON.stringify({ password: pw }) }); setCreated({ username: u, password: pw }); });
  };
  if (!data && !err) return <Loading />;
  const inp = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40";
  const permLabel = (id: string) => data?.perms.find((p) => p.id === id)?.label ?? id;
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
        <b>الملكية لك وحدك:</b> حسابك (المالك) ثابت من إعدادات الخادم ولا يقدر أحد يعدّله أو يحذفه. أي تغيير في دور العضو أو كلمة مروره أو إيقافه يُخرجه من جلسته فوراً.
      </div>
      {demo && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"><b>وضع العرض:</b> تقدر تجرّب إنشاء الحسابات وتحديد الصلاحيات هنا، لكنها مؤقتة وما يقدر العضو يسجل دخول فيها لين تربط Upstash Redis.</div>}
      {!demo && <OwnerVerify />}
      {err && <Problem text={err} />}
      {ok && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{ok}</div>}
      {created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          أرسل للعضو بيانات الدخول (تظهر مرة واحدة فقط): رابط الدخول <b dir="ltr">{typeof window !== "undefined" ? `${location.origin}/login` : "/login"}</b> · اسم المستخدم <b dir="ltr" className="font-latin">{created.username}</b> · كلمة المرور <b dir="ltr" className="font-latin">{created.password}</b>
          <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/login\n${created.username}\n${created.password}`).catch(() => {}); }} className="ms-2 rounded-lg border border-emerald-300 bg-white px-2 py-0.5 text-xs">نسخ</button>
          <button onClick={() => setCreated(null)} className="ms-1 rounded-lg px-2 py-0.5 text-xs">إخفاء</button>
        </div>
      )}

      {data && (
        <form onSubmit={add} className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <div>
            <h3 className="text-sm font-semibold">إنشاء حساب لعضو في الفريق</h3>
            <p className="mt-1 text-xs text-muted">اكتب بياناته واختر دوره وصلاحياته، وبعدها أرسل له بيانات الدخول. عند كل دخول يوصله <b>رمز تحقق</b> على واتساب (إذا أضفت جواله) أو على إيميله، فلازم تضيف واحد منهم على الأقل.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-muted">الاسم<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="سارة — المبيعات" className={inp} /></label>
            <label className="text-xs text-muted">اسم المستخدم (إنجليزي)<input required dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="sara" className={inp} /></label>
            <label className="text-xs text-muted">إيميل الموظف<input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sara@company.sa" className={inp} /></label>
            <label className="text-xs text-muted">رقم جوال الموظف (واتساب)<input dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" className={inp + " font-latin"} /></label>
            <label className="text-xs text-muted">كلمة المرور
              <span className="flex gap-1"><input required minLength={8} dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp + " font-latin"} />
                <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} className="h-10 shrink-0 rounded-xl border border-line px-2 text-xs">توليد</button></span>
            </label>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold">الدور والصلاحيات</div>
            <PermsEditor data={data} level={form.level} perms={form.perms} onChange={(level, perms) => setForm({ ...form, level, perms })} />
          </div>
          <button disabled={busy === "add" || (!form.email.trim() && !form.phone.trim())} className="h-10 rounded-xl bg-ink px-5 text-sm text-paper">{busy === "add" ? "…" : "إنشاء الحساب"}</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
            <th className="p-3 font-medium">العضو</th><th className="p-3 font-medium">الدور والصلاحيات</th><th className="p-3 font-medium">الحالة</th><th className="p-3 font-medium">آخر دخول</th><th className="p-3" />
          </tr></thead>
          <tbody>
            <tr className="border-b border-line bg-amber-50/40">
              <td className="p-3 font-medium"><span dir="ltr" className="font-latin">{data?.owner}</span> <span className="text-xs text-muted">(أنت)</span></td>
              <td className="p-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">المالك · كل الصلاحيات</span></td>
              <td className="p-3 text-xs text-muted">ثابت — يُدار من إعدادات الخادم</td><td className="p-3" /><td className="p-3" />
            </tr>
            {data?.members.map((m) => (
              <React.Fragment key={m.username}>
                <tr className="border-b border-line last:border-0">
                  <td className="p-3"><div className="font-medium">{m.name}</div><div dir="ltr" className="text-right font-latin text-xs text-muted">{m.username}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{m.phone ? <span dir="ltr">📱 {m.phone}</span> : null}{m.phone && m.email ? " · " : ""}{m.email ? <span dir="ltr">✉ {m.email}</span> : null}{!m.phone && !m.email && <span className="text-red-600">ما له إيميل أو جوال — ما يقدر يدخل</span>}</div></td>
                  <td className="p-3">
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold">{ROLE_INFO[m.level]}</span>
                    <div className="mt-1 flex flex-wrap gap-1">{m.effective.length ? m.effective.map((p) => <span key={p} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800">{permLabel(p)}</span>) : <span className="text-[11px] text-muted">مشاهدة فقط</span>}</div>
                  </td>
                  <td className="p-3 text-xs">{m.disabled ? <span className="font-semibold text-red-600">موقوف</span> : <span className="text-emerald-700">فعّال</span>}</td>
                  <td className="p-3 text-xs text-muted">{m.lastLoginAt ? date(m.lastLoginAt) : "لم يدخل بعد"}</td>
                  <td className="p-3 text-left">
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      <button disabled={busy === m.username} onClick={() => setEdit(edit?.u === m.username ? null : { u: m.username, level: m.level, perms: m.effective, email: m.email ?? "", phone: m.phone ?? "" })} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">{edit?.u === m.username ? "إغلاق" : "تعديل"}</button>
                      <button disabled={busy === m.username} onClick={() => resetPw(m.username)} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">كلمة مرور جديدة</button>
                      <button disabled={busy === m.username} onClick={() => patch(m.username, { disabled: !m.disabled })} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">{m.disabled ? "تفعيل" : "إيقاف"}</button>
                      {confirm === m.username
                        ? <button onClick={() => { setConfirm(null); run(m.username, () => api(`/api/admin/team/${encodeURIComponent(m.username)}`, { method: "DELETE" })); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white">تأكيد الحذف</button>
                        : <button onClick={() => setConfirm(m.username)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>}
                    </span>
                  </td>
                </tr>
                {edit?.u === m.username && data && (
                  <tr className="border-b border-line bg-paper/60">
                    <td colSpan={5} className="p-4">
                      <div className="mb-4 grid gap-3 md:grid-cols-2">
                        <label className="text-xs text-muted">إيميل الموظف<input type="email" dir="ltr" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className={inp} /></label>
                        <label className="text-xs text-muted">رقم جوال الموظف (واتساب)<input dir="ltr" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="05xxxxxxxx" className={inp + " font-latin"} /></label>
                      </div>
                      <PermsEditor data={data} level={edit.level} perms={edit.perms} onChange={(level, perms) => setEdit({ ...edit, level, perms })} />
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy === m.username} onClick={() => { patch(m.username, { level: edit.level, perms: edit.perms, email: edit.email, phone: edit.phone }, `تم حفظ بيانات وصلاحيات ${m.name}.`); setEdit(null); }} className="h-9 rounded-xl bg-ink px-4 text-sm text-paper">حفظ التعديلات</button>
                        <button onClick={() => setEdit(null)} className="h-9 rounded-xl border border-line px-4 text-sm">إلغاء</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {data && !data.members.length && <div className="p-4 text-center text-xs text-muted">لا يوجد أعضاء بعد — أنت المالك والوحيد في اللوحة.</div>}
      </div>
    </div>
  );
}

type Fin = {
  days: number; revenue: number; revenueOnce: number; revenueMonthly: number; revenueOther: number; payments: number; paymentsOnce: number; paymentsMonthly: number;
  variable: { metric: string; label: string; unit: number; qty: number; amount: number; source: string; estimate?: boolean }[];
  gateway: { qty: number; amount: number; pct: number; fixed: number };
  fixed: { label: string; monthly: number; amount: number; note: string; estimate?: boolean }[];
  varTotal: number; fixedTotal: number; zakat: number; zakatRate: number; costs: number; net: number; margin: number;
  series: { days: string[]; revenue: number[] };
  snapshot: { paidCustomers: number; activeOnce: number; subscribers: number; mrr: number };
  perCustomer: { revenue: number; cost: number };
  plans: { once: number; monthly: number };
};
const sar = (n: number) => `${n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: n < 100 ? 2 : 0 })} ر.س`;
function FinanceTab() {
  const [days, setDays] = React.useState(30);
  const [d, setD] = React.useState<Fin | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { setD(null); api<Fin>(`/api/admin/finance?days=${days}`).then(setD).catch((e) => setErr(e.message)); }, [days]);
  if (err) return <Problem text={err} />;
  const period = days === 30 ? "آخر 30 يوماً" : days === 90 ? "آخر 90 يوماً" : "آخر سنة";
  const Est = () => <span className="ms-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">تقديري</span>;
  const row = "border-b border-line last:border-0";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[30, 90, 365].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={`rounded-full px-3 py-1.5 text-xs ${days === n ? "bg-ink text-paper" : "border border-line bg-white"}`}>{n === 30 ? "30 يوماً" : n === 90 ? "90 يوماً" : "سنة"}</button>
        ))}
        <span className="text-xs text-muted">مالية هذا التطبيق وحده · الإيراد من المدفوعات الفعلية، والتكاليف من عدد العمليات الفعلي × سعر الوحدة.</span>
      </div>
      {!d ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label={`الإيراد · ${period}`} value={sar(d.revenue)} sub={`${fmt(d.payments)} عملية دفع`} />
            <Kpi label={`التكاليف · ${period}`} value={sar(d.costs)} sub={`متغيرة ${sar(d.varTotal)} · ثابتة ${sar(d.fixedTotal)}`} />
            <Kpi label="صافي الربح" value={sar(d.net)} sub={d.revenue ? `هامش ${Math.round(d.margin * 100)}%` : "لا إيراد بعد"} tone={d.net < 0 ? "warn" : undefined} />
            <Kpi label="الدخل الشهري المتكرر الآن" value={sar(d.snapshot.mrr)} sub={`${fmt(d.snapshot.subscribers)} مشترك شهري · ${fmt(d.snapshot.paidCustomers)} عميل دافع`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DailyBars title="الإيراد اليومي" span={period} days={d.series.days} values={d.series.revenue} unit=" ر.س" />
            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold">الإيراد حسب الباقة</h3>
              <table className="w-full text-sm"><tbody>
                <tr className={row}><td className="py-2">مرة واحدة ({fmt(d.paymentsOnce)} × {d.plans.once} ر.س)</td><td className="py-2 text-left font-latin">{sar(d.revenueOnce)}</td></tr>
                <tr className={row}><td className="py-2">اشتراك شهري ({fmt(d.paymentsMonthly)} دفعة × {d.plans.monthly} ر.س)</td><td className="py-2 text-left font-latin">{sar(d.revenueMonthly)}</td></tr>
                {d.revenueOther > 0 && <tr className={row}><td className="py-2 text-muted">مدفوعات قبل تقسيم الباقات</td><td className="py-2 text-left font-latin">{sar(d.revenueOther)}</td></tr>}
                <tr><td className="pt-3 font-semibold">الإجمالي</td><td className="pt-3 text-left font-latin font-semibold">{sar(d.revenue)}</td></tr>
              </tbody></table>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-paper p-3"><div className="text-muted">إيراد العميل الدافع</div><div className="mt-1 font-latin text-base">{sar(d.perCustomer.revenue)}</div></div>
                <div className="rounded-xl bg-paper p-3"><div className="text-muted">تكلفة العميل الدافع</div><div className="mt-1 font-latin text-base">{sar(d.perCustomer.cost)}</div><div className="text-[10px] text-muted">تشمل تكلفة الزوار اللي ما دفعوا</div></div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
                <th className="p-3 font-medium">بند التكلفة · {period}</th><th className="p-3 font-medium">الكمية</th><th className="p-3 font-medium">سعر الوحدة</th><th className="p-3 font-medium">المبلغ</th><th className="p-3 font-medium">الأساس</th>
              </tr></thead>
              <tbody>
                <tr className="bg-ink/[0.03]"><td colSpan={5} className="p-2 px-3 text-xs font-semibold">تكاليف متغيرة (حسب الاستخدام)</td></tr>
                {d.variable.map((v) => (
                  <tr key={v.metric} className={row}>
                    <td className="p-3">{v.label}{v.estimate && <Est />}</td><td className="p-3 font-latin">{fmt(v.qty)}</td><td className="p-3 font-latin">{v.unit.toFixed(2)}</td><td className="p-3 font-latin">{sar(v.amount)}</td><td className="p-3 text-xs text-muted">{v.source}</td>
                  </tr>
                ))}
                <tr className={row}><td className="p-3">رسوم بوابة الدفع<Est /></td><td className="p-3 font-latin">{fmt(d.gateway.qty)}</td><td className="p-3 font-latin text-xs">{(d.gateway.pct * 100).toFixed(2)}% + {d.gateway.fixed}</td><td className="p-3 font-latin">{sar(d.gateway.amount)}</td><td className="p-3 text-xs text-muted">مدى 70% بـ 1%، وبطاقات 30% بـ 2.5%، ورسم ثابت لكل عملية</td></tr>
                <tr className="bg-ink/[0.03]"><td colSpan={5} className="p-2 px-3 text-xs font-semibold">مصاريف ثابتة (لهذا التطبيق، والمشترك بالنص)</td></tr>
                {d.fixed.map((f) => (
                  <tr key={f.label} className={row}>
                    <td className="p-3">{f.label}{f.estimate && <Est />}</td><td className="p-3 font-latin">{(d.days / 30.44).toFixed(1)} شهر</td><td className="p-3 font-latin">{f.monthly.toFixed(2)} / شهر</td><td className="p-3 font-latin">{sar(f.amount)}</td><td className="p-3 text-xs text-muted">{f.note}</td>
                  </tr>
                ))}
                <tr className={row}><td className="p-3">زكاة تقديرية<Est /></td><td className="p-3" /><td className="p-3 font-latin">{Math.round(d.zakatRate * 1000) / 10}%</td><td className="p-3 font-latin">{sar(d.zakat)}</td><td className="p-3 text-xs text-muted">من صافي الربح، والوعاء الفعلي يحدده المحاسب</td></tr>
                <tr><td className="p-3 font-semibold">إجمالي التكاليف</td><td /><td /><td className="p-3 font-latin font-semibold">{sar(d.costs)}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            الأسعار من صفحات المزودين (أكتوبر 2026) والدولار بـ 3.75، وتقدر تعدّل أي سعر من متغيرات البيئة (مثل COST_AI_LOGO_SAR وCOST_SMS_SAR وGATEWAY_PCT وFIXED_VERCEL_SAR) بدون تعديل الكود.
            غير محسوب: ضريبة القيمة المضافة (إلزامية فوق 375 ألف ر.س سنوياً)، وراتبك، والتسويق.
          </p>
        </>
      )}
    </div>
  );
}

type CouponRow = { code: string; type: "percent" | "fixed"; value: number; plans: PlanKind[]; maxUses: number | null; uses: number; expiresAt: number | null; active: boolean; note?: string; createdAt: number };
const randomCode = () => "SAVE" + Array.from(crypto.getRandomValues(new Uint8Array(3)), (x) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[x % 31]).join("");
type PayM = { bank?: { enabled: boolean; bankName: string; holder: string; iban: string }; stcpay?: { enabled: boolean; number: string }; link?: { enabled: boolean; url: string; label: string }; whatsapp?: string; note?: string; at?: number; by?: string };
type GW = { id: string; name: string; configured: boolean; mode: "test" | "live" | null; methods: string };
function GatewaysSection() {
  const [d, setD] = React.useState<{ gateways: GW[]; active: string | null; setting: string | null } | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { api<NonNullable<typeof d>>("/api/admin/gateways").then(setD).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  const choose = async (active: string) => {
    setBusy(true); setMsg(null);
    try { setD(await api("/api/admin/gateways", { method: "PUT", body: JSON.stringify({ active }) })); setMsg({ ok: true, text: active === "off" ? "أوقفت الدفع الإلكتروني. العملاء يشوفون طرق التحويل فقط." : "تم. العملاء يدفعون الحين من هذي البوابة، والتفعيل تلقائي." }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  if (!d) return msg ? <Problem text={msg.text} /> : null;
  const envName: Record<string, string> = { moyasar: "MOYASAR_SECRET_KEY", tap: "TAP_SECRET_KEY" };
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-sm font-semibold">الدفع الإلكتروني (تفعيل تلقائي)</h3>
      <p className="mt-1 text-xs text-muted">العميل يضغط «ادفع الآن» ويدفع بمدى أو آبل باي أو البطاقة أو STC Pay، وأول ما ينجح الدفع يتفعّل طلبه تلقائياً ويوصلك المبلغ في حساب البوابة. اختر البوابة اللي فتحت فيها حساب تاجر.</p>
      {msg && <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</div>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {d.gateways.map((g) => {
          const on = d.active === g.id;
          return (
            <div key={g.id} className={`rounded-xl border p-4 ${on ? "border-emerald-400 bg-emerald-50/60" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{g.name}</div>
                {on ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">المفعّلة</span>
                  : g.configured ? <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px]">جاهزة</span> : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">ما انضاف المفتاح</span>}
              </div>
              <div className="mt-1 text-xs text-muted">{g.methods}</div>
              <div className="mt-2 text-xs">{g.configured ? (g.mode === "live" ? <span className="font-semibold text-emerald-700">مفتاح حقيقي — يستقبل فلوس فعلية</span> : <span className="font-semibold text-amber-700">مفتاح تجريبي — للتجربة بدون فلوس</span>)
                : <>أضف <code dir="ltr" className="rounded bg-ink/5 px-1 font-latin">{envName[g.id]}</code> في إعدادات المشروع على فيرسل، ثم أعد النشر.</>}</div>
              {g.configured && !on && <button disabled={busy} onClick={() => choose(g.id)} className="mt-3 h-9 rounded-xl bg-ink px-4 text-sm text-paper">تفعيل {g.name}</button>}
            </div>
          );
        })}
      </div>
      {d.active && <button disabled={busy} onClick={() => choose("off")} className="mt-3 text-xs text-muted underline">إيقاف الدفع الإلكتروني مؤقتاً</button>}
      {!d.active && d.setting === "off" && d.gateways.some((g) => g.configured) && <p className="mt-3 text-xs text-amber-700">الدفع الإلكتروني موقوف. اختر بوابة لتفعيله.</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-muted">رابط الإشعار اللي تطلبه البوابة يُرسل تلقائياً مع كل عملية: <code dir="ltr" className="font-latin">/api/pay/webhook/…</code>. وطرق التحويل اليدوي تحت تبقى خيار إضافي للعميل.</p>
    </section>
  );
}

function PayMethodsSection() {
  const [f, setF] = React.useState<Required<Pick<PayM, "bank" | "stcpay" | "link">> & { whatsapp: string; note: string }>({
    bank: { enabled: false, bankName: "", holder: "", iban: "" }, stcpay: { enabled: false, number: "" }, link: { enabled: false, url: "", label: "ادفع بمدى أو Apple Pay" }, whatsapp: "", note: "",
  });
  const [meta, setMeta] = React.useState<{ at?: number; by?: string } | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    api<{ methods: PayM | null }>("/api/admin/payment-methods").then(({ methods: m }) => {
      if (!m) return;
      setMeta({ at: m.at, by: m.by });
      setF((x) => ({ bank: m.bank ?? x.bank, stcpay: m.stcpay ?? x.stcpay, link: m.link ?? x.link, whatsapp: m.whatsapp ?? "", note: m.note ?? "" }));
    }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);
  const save = async () => {
    setBusy(true); setMsg(null);
    try { const d = await api<{ methods: PayM }>("/api/admin/payment-methods", { method: "PUT", body: JSON.stringify(f) }); setMeta({ at: d.methods.at, by: d.methods.by }); setMsg({ ok: true, text: "تم حفظ طرق السداد، وتظهر للعملاء خلال ثواني." }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const inp = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40 disabled:bg-paper disabled:text-muted";
  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /> {label}</label>
  );
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-sm font-semibold">طرق السداد</h3>
      <p className="mt-1 text-xs text-muted">بعد ما يختار العميل باقته يشوف المبلغ ورقم الطلب وطرق السداد المفعّلة هنا، مع زر يرسل لك الإيصال على واتساب. لما يوصلك المبلغ فعّل طلبه من «الطلبات والمدفوعات».{meta?.at ? ` آخر تعديل ${date(meta.at)}${meta.by ? ` بواسطة ${meta.by}` : ""}.` : ""}</p>
      {msg && <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</div>}
      <div className="mt-4 space-y-4">
        <div className="space-y-2 rounded-xl border border-line p-4">
          <Toggle on={f.bank.enabled} set={(v) => setF({ ...f, bank: { ...f.bank, enabled: v } })} label="تحويل بنكي" />
          <div className="grid gap-2 md:grid-cols-3">
            <label className="text-xs text-muted">اسم البنك<input disabled={!f.bank.enabled} value={f.bank.bankName} onChange={(e) => setF({ ...f, bank: { ...f.bank, bankName: e.target.value } })} placeholder="مصرف الراجحي" className={inp} /></label>
            <label className="text-xs text-muted">اسم صاحب الحساب<input disabled={!f.bank.enabled} value={f.bank.holder} onChange={(e) => setF({ ...f, bank: { ...f.bank, holder: e.target.value } })} placeholder="مؤسسة ..." className={inp} /></label>
            <label className="text-xs text-muted">الآيبان<input disabled={!f.bank.enabled} dir="ltr" value={f.bank.iban} onChange={(e) => setF({ ...f, bank: { ...f.bank, iban: e.target.value.toUpperCase() } })} placeholder="SA0000000000000000000000" className={inp + " font-latin"} /></label>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-line p-4">
            <Toggle on={f.stcpay.enabled} set={(v) => setF({ ...f, stcpay: { ...f.stcpay, enabled: v } })} label="STC Pay" />
            <label className="text-xs text-muted">رقم STC Pay<input disabled={!f.stcpay.enabled} dir="ltr" value={f.stcpay.number} onChange={(e) => setF({ ...f, stcpay: { ...f.stcpay, number: e.target.value } })} placeholder="05xxxxxxxx" className={inp + " font-latin"} /></label>
          </div>
          <div className="space-y-2 rounded-xl border border-line p-4">
            <Toggle on={f.link.enabled} set={(v) => setF({ ...f, link: { ...f.link, enabled: v } })} label="رابط دفع (مدى، Apple Pay، بطاقات)" />
            <label className="text-xs text-muted">الرابط من بوابة الدفع (ميسّر أو Tap أو غيرها)<input disabled={!f.link.enabled} dir="ltr" value={f.link.url} onChange={(e) => setF({ ...f, link: { ...f.link, url: e.target.value } })} placeholder="https://..." className={inp + " font-latin"} /></label>
            <label className="text-xs text-muted">نص الزر<input disabled={!f.link.enabled} value={f.link.label} onChange={(e) => setF({ ...f, link: { ...f.link, label: e.target.value } })} className={inp} /></label>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-muted">رقم واتساب لاستلام الإيصالات<input dir="ltr" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="05xxxxxxxx" className={inp + " font-latin"} /></label>
          <label className="text-xs text-muted">ملاحظة للعميل (اختياري)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثلاً: نفعّل الطلبات من 9 الصبح لين 11 الليل" className={inp} /></label>
        </div>
        <button disabled={busy} onClick={save} className="h-10 rounded-xl bg-ink px-5 text-sm text-paper">{busy ? "…" : "حفظ طرق السداد"}</button>
      </div>
    </section>
  );
}

function PricingTab({ onSaved }: { onSaved: (p: { once: number; monthly: number }) => void }) {
  const [pr, setPr] = React.useState<{ current: { once: number; monthly: number }; defaults: { once: number; monthly: number }; override: { at?: number; by?: string } | null } | null>(null);
  const [form, setForm] = React.useState({ once: "", monthly: "" });
  const [coupons, setCoupons] = React.useState<CouponRow[] | null>(null);
  const [cf, setCf] = React.useState({ code: randomCode(), type: "percent" as "percent" | "fixed", value: "10", once: true, monthly: true, maxUses: "", expires: "", note: "" });
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    api<NonNullable<typeof pr>>("/api/admin/pricing").then((d) => { setPr(d); setForm({ once: String(d.current.once), monthly: String(d.current.monthly) }); }).catch((e) => setMsg({ ok: false, text: e.message }));
    api<{ coupons: CouponRow[] }>("/api/admin/coupons").then((d) => setCoupons(d.coupons)).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  };
  const savePrices = (reset = false) => run("prices", async () => {
    const d = await api<NonNullable<typeof pr>>("/api/admin/pricing", { method: "PUT", body: JSON.stringify(reset ? { reset: true } : { once: Number(form.once), monthly: Number(form.monthly) }) });
    onSaved(d.current);
  }, reset ? "رجعت الأسعار للافتراضي." : "تم حفظ الأسعار، وتظهر للعملاء خلال ثواني.");
  const addCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const plans = [cf.once && "once", cf.monthly && "monthly"].filter(Boolean);
    run("coupon", async () => {
      await api("/api/admin/coupons", { method: "POST", body: JSON.stringify({ code: cf.code, type: cf.type, value: Number(cf.value), plans, maxUses: cf.maxUses ? Number(cf.maxUses) : null, expiresAt: cf.expires ? new Date(cf.expires + "T23:59:59+03:00").getTime() : null, note: cf.note }) });
      setCf({ ...cf, code: randomCode(), note: "" });
    }, `تم إنشاء الكود ${cf.code.toUpperCase()}.`);
  };
  const inp = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40";
  const after = (c: CouponRow, base: number) => Math.max(0, Math.round((base - (c.type === "percent" ? (base * c.value) / 100 : c.value)) * 100) / 100);
  if (!pr) return <Loading />;
  const discountLabel = (c: Pick<CouponRow, "type" | "value">) => (c.type === "percent" ? `${c.value}%` : `${c.value} ر.س`);
  return (
    <div className="space-y-6">
      {msg && <div className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg.text}</div>}
      <section className="rounded-2xl border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">أسعار الباقات</h3>
        <p className="mt-1 text-xs text-muted">السعر الجديد يطبَّق على الطلبات الجديدة، وما يغيّر المدفوعات السابقة. الافتراضي من إعدادات الخادم: مرة واحدة {pr.defaults.once} ر.س · شهري {pr.defaults.monthly} ر.س.{pr.override?.at ? ` آخر تعديل ${date(pr.override.at)}${pr.override.by ? ` بواسطة ${pr.override.by}` : ""}.` : ""}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="text-xs text-muted">سعر المرة الواحدة (ر.س)<input type="number" min={1} dir="ltr" value={form.once} onChange={(e) => setForm({ ...form, once: e.target.value })} className={inp + " font-latin"} /></label>
          <label className="text-xs text-muted">سعر الاشتراك الشهري (ر.س)<input type="number" min={1} dir="ltr" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} className={inp + " font-latin"} /></label>
          <button disabled={busy === "prices"} onClick={() => savePrices()} className="h-10 rounded-xl bg-ink px-4 text-sm text-paper">{busy === "prices" ? "…" : "حفظ الأسعار"}</button>
          <button disabled={busy === "prices" || !pr.override} onClick={() => savePrices(true)} className="h-10 rounded-xl border border-line px-4 text-sm disabled:opacity-40">رجوع للافتراضي</button>
        </div>
      </section>

      <GatewaysSection />

      <PayMethodsSection />

      <section className="rounded-2xl border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">أكواد الخصم</h3>
        <p className="mt-1 text-xs text-muted">العميل يكتب الكود في نافذة الدفع ويشوف السعر بعد الخصم، ويوصلك طلبه بالسعر المخفّض. الاستخدام يُحسب لما تفعّل الطلب. في الشهري الخصم على أول شهر.</p>
        <form onSubmit={addCoupon} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-xs text-muted">الكود
            <span className="flex gap-1"><input required dir="ltr" value={cf.code} onChange={(e) => setCf({ ...cf, code: e.target.value.toUpperCase() })} className={inp + " font-latin uppercase"} />
              <button type="button" onClick={() => setCf({ ...cf, code: randomCode() })} className="h-10 shrink-0 rounded-xl border border-line px-2 text-xs">توليد</button></span>
          </label>
          <label className="text-xs text-muted">نوع الخصم
            <select value={cf.type} onChange={(e) => setCf({ ...cf, type: e.target.value as "percent" | "fixed" })} className={inp}><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت (ر.س)</option></select>
          </label>
          <label className="text-xs text-muted">{cf.type === "percent" ? "النسبة (%)" : "المبلغ (ر.س)"}<input required type="number" min={1} max={cf.type === "percent" ? 100 : undefined} dir="ltr" value={cf.value} onChange={(e) => setCf({ ...cf, value: e.target.value })} className={inp + " font-latin"} /></label>
          <div className="text-xs text-muted">يشمل
            <div className="mt-2 flex gap-3 text-sm text-ink">
              <label className="flex items-center gap-1"><input type="checkbox" checked={cf.once} onChange={(e) => setCf({ ...cf, once: e.target.checked })} /> مرة واحدة</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={cf.monthly} onChange={(e) => setCf({ ...cf, monthly: e.target.checked })} /> شهري</label>
            </div>
          </div>
          <label className="text-xs text-muted">حد الاستخدام (اختياري)<input type="number" min={1} dir="ltr" value={cf.maxUses} onChange={(e) => setCf({ ...cf, maxUses: e.target.value })} placeholder="بدون حد" className={inp + " font-latin"} /></label>
          <label className="text-xs text-muted">ينتهي في (اختياري)<input type="date" dir="ltr" value={cf.expires} onChange={(e) => setCf({ ...cf, expires: e.target.value })} className={inp} /></label>
          <label className="text-xs text-muted">ملاحظة<input value={cf.note} onChange={(e) => setCf({ ...cf, note: e.target.value })} placeholder="مثلاً: حملة رمضان" className={inp} /></label>
          <button disabled={busy === "coupon" || (!cf.once && !cf.monthly)} className="h-10 self-end rounded-xl bg-ink px-4 text-sm text-paper">{busy === "coupon" ? "…" : "إنشاء الكود"}</button>
        </form>
        <p className="mt-2 text-xs text-muted">معاينة: مرة واحدة {pr.current.once} ← <b>{after({ type: cf.type, value: Number(cf.value) || 0 } as CouponRow, pr.current.once)}</b> ر.س · شهري {pr.current.monthly} ← <b>{after({ type: cf.type, value: Number(cf.value) || 0 } as CouponRow, pr.current.monthly)}</b> ر.س</p>
        <div className="mt-4 overflow-x-auto">
          {!coupons ? <Loading /> : !coupons.length ? <Empty text="ما فيه أكواد خصم بعد." /> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
                <th className="p-2 font-medium">الكود</th><th className="p-2 font-medium">الخصم</th><th className="p-2 font-medium">السعر بعده</th><th className="p-2 font-medium">الاستخدام</th><th className="p-2 font-medium">ينتهي</th><th className="p-2 font-medium">الحالة</th><th className="p-2" />
              </tr></thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = !!c.expiresAt && c.expiresAt < Date.now(), full = !!c.maxUses && c.uses >= c.maxUses;
                  return (
                    <tr key={c.code} className="border-b border-line last:border-0">
                      <td className="p-2"><b dir="ltr" className="font-latin">{c.code}</b>{c.note && <div className="text-[11px] text-muted">{c.note}</div>}</td>
                      <td className="p-2 text-xs">{discountLabel(c)} · {c.plans.length === 2 ? "الباقتين" : c.plans[0] === "once" ? "مرة واحدة" : "شهري"}</td>
                      <td className="p-2 font-latin text-xs">{c.plans.map((k) => `${k === "once" ? "مرة" : "شهري"} ${after(c, pr.current[k])}`).join(" · ")}</td>
                      <td className="p-2 font-latin text-xs">{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                      <td className="p-2 text-xs">{c.expiresAt ? date(c.expiresAt) : "—"}</td>
                      <td className="p-2 text-xs">{!c.active ? <span className="text-muted">موقوف</span> : expired ? <span className="text-red-600">منتهي</span> : full ? <span className="text-amber-700">اكتمل</span> : <span className="font-semibold text-emerald-700">فعّال</span>}</td>
                      <td className="p-2 text-left">
                        <span className="inline-flex gap-1">
                          <button disabled={busy === c.code} onClick={() => run(c.code, () => api(`/api/admin/coupons/${encodeURIComponent(c.code)}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) }), c.active ? `أوقفت ${c.code}.` : `فعّلت ${c.code}.`)} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">{c.active ? "إيقاف" : "تفعيل"}</button>
                          {confirm === c.code
                            ? <button onClick={() => { setConfirm(null); run(c.code, () => api(`/api/admin/coupons/${encodeURIComponent(c.code)}`, { method: "DELETE" }), `حذفت ${c.code}.`); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white">تأكيد الحذف</button>
                            : <button onClick={() => setConfirm(c.code)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const USAGE_LABEL: Record<string, string> = {
  ai_logos: "دفعات شعارات بالذكاء الاصطناعي", ai_logo_image: "شعارات Recraft (لكل شعار)", ai_identity: "صياغة هوية / شعارات Gemini",
  name_check: "فحص أسماء", menu_ai: "اقتراحات منيو", dish_photo: "صور أطباق", publish: "نشر منيو", payment_request: "طلبات تفعيل", payment: "عمليات دفع",
  otp_email: "رموز تحقق بالبريد", otp_whatsapp: "رموز تحقق بواتساب", otp_sms: "رموز تحقق SMS", design_save: "حفظ تصاميم", login: "دخول عملاء", signup: "تسجيلات جديدة",
};

function UsageTab() {
  const [d, setD] = React.useState<Overview | null>(null);
  const [err, setErr] = React.useState("");
  React.useEffect(() => { api<Overview>("/api/admin/overview").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Problem text={err} />;
  if (!d) return <Loading />;
  const rows = Object.entries(d.totals).filter(([m]) => USAGE_LABEL[m]);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
            <th className="p-3 font-medium">العملية</th><th className="p-3 font-medium">آخر 30 يوماً</th><th className="p-3 font-medium">تكلفة الوحدة</th><th className="p-3 font-medium">التكلفة التقديرية</th>
          </tr></thead>
          <tbody>
            {rows.map(([m, n]) => (
              <tr key={m} className="border-b border-line last:border-0">
                <td className="p-3">{USAGE_LABEL[m]}</td>
                <td className="p-3 font-latin">{fmt(n)}</td>
                <td className="p-3 text-xs text-muted">{d.cost[m] !== undefined ? `${d.cost[m]} ر.س` : "—"}</td>
                <td className="p-3 font-semibold">{d.cost[m] !== undefined ? `${fmt(Math.round(n * d.cost[m] * 100) / 100)} ر.س` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-muted">التكلفة تقديرية من عدد العمليات × سعر الوحدة (يُعدّل من متغيرات COST_* في البيئة). الفاتورة الفعلية في لوحة Recraft وGoogle AI Studio.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars title="شعارات بالذكاء الاصطناعي" days={d.series.days} values={d.series.series.ai_logos ?? []} />
        <DailyBars title="رموز التحقق المرسلة" days={d.series.days} values={d.series.days.map((_, i) => (d.series.series.otp_email?.[i] ?? 0) + (d.series.series.otp_sms?.[i] ?? 0))} />
      </div>
    </div>
  );
}

function AiCheck() {
  const [d, setD] = React.useState<{ checks: { name: string; ok: boolean; detail: string; balance?: string }[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const run = async () => { setBusy(true); setErr(""); try { setD(await api("/api/admin/ai-check")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="mb-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">أدوات الذكاء للتوليد</h3>
          <p className="mt-1 text-xs text-muted">Gemini للهوية والمنيو وفحص الاسم، وRecraft للشعارات المتجهية وصور الأطباق. الفحص ما يستهلك من رصيدك.</p>
        </div>
        <button onClick={run} disabled={busy} className="rounded-xl bg-ink px-4 py-2 text-sm text-paper">{busy ? "يفحص…" : "اختبار أدوات الذكاء"}</button>
      </div>
      {err && <div className="mt-3"><Problem text={err} /></div>}
      {d && (
        <div className="mt-4 space-y-2">
          {d.checks.map((c) => (
            <div key={c.name} className={`rounded-xl px-3 py-2 text-sm ${c.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
              <b className="font-latin">{c.name}</b> · {c.ok ? "✓ " : "⚠ "}{c.detail}
              {c.balance && <div className="mt-0.5 text-xs">الرصيد: {c.balance}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ rows }: { rows: SettingRow[] }) {
  return (
    <>
    <AiCheck />
    
    <div className="rounded-2xl border border-line bg-white p-2">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3 text-sm last:border-0">
          <div>
            <div className="font-medium">{r.label}</div>
            {r.hint && <div className="text-[11px] text-muted">{r.hint}</div>}
          </div>
          <span className="flex items-center gap-2 text-sm" dir="auto">
            {r.ok !== undefined && <span className={`h-2 w-2 rounded-full ${r.ok ? "bg-emerald-500" : "bg-amber-500"}`} />}
            {r.value}
          </span>
        </div>
      ))}
    </div>
    </>
  );
}

const Loading = () => <div className="py-10 text-center text-sm text-muted">يحمّل…</div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-muted">{text}</div>;
const Problem = ({ text }: { text: string }) => <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{text}</div>;

export function AdminDashboard({ brand, settings, extraTabs = [], kvReady, demoStore = false, me = { username: "", owner: true, level: "owner" } }: { brand: string; settings: SettingRow[]; extraTabs?: { id: string; label: string; node: React.ReactNode }[]; kvReady: boolean; demoStore?: boolean; me?: AdminMe }) {
  const tabs = [
    { id: "overview", label: "نظرة عامة" }, { id: "payments", label: "الطلبات والمدفوعات" }, { id: "customers", label: "العملاء" }, { id: "designs", label: "التصاميم" },
    ...extraTabs.map(({ id, label }) => ({ id, label })), { id: "usage", label: "الاستخدام والتكاليف" },
    ...(me.owner || me.perms?.includes("pricing") ? [{ id: "pricing", label: "الأسعار والسداد" }] : []),
    ...(me.owner || me.perms?.includes("finance") ? [{ id: "finance", label: "المالية" }] : []),
    ...(me.owner ? [ { id: "team", label: "الفريق" }, { id: "settings", label: "الإعدادات" }] : []),
  ];
  const [tab, setTab] = React.useState("overview");
  const [prices, setPrices] = React.useState({ once: DEFAULT_PLANS.once.price, monthly: DEFAULT_PLANS.monthly.price });
  React.useEffect(() => { if (kvReady) api<{ current: { once: number; monthly: number } }>("/api/admin/pricing").then((d) => setPrices(d.current)).catch(() => {}); }, [kvReady]);
  const [ver, setVer] = React.useState(0);
  const [ownerOk, setOwnerOk] = React.useState(true);
  React.useEffect(() => { if (me.owner && kvReady && !demoStore) api<{ active: boolean }>("/api/admin/owner-contact").then((d) => setOwnerOk(d.active)).catch(() => {}); }, [me.owner, kvReady, demoStore, ver]);
  const [examples, setExamples] = React.useState<boolean | null>(null);
  const [exBusy, setExBusy] = React.useState(false);
  React.useEffect(() => { if (kvReady) api<{ exists: boolean }>("/api/admin/examples").then((d) => setExamples(d.exists)).catch(() => {}); }, [kvReady]);
  const toggleExamples = async () => {
    setExBusy(true);
    try {
      await api("/api/admin/examples", { method: examples ? "DELETE" : "POST" });
      setExamples(!examples); setVer((v) => v + 1);
    } finally { setExBusy(false); }
  };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };
  return (
    <MeCtx.Provider value={me}>
    <PricesCtx.Provider value={prices}>
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted">{brand}</div>
          <h1 className="font-display text-2xl font-bold">لوحة التحكم</h1>
          {me.username && <div className="mt-1 text-xs text-muted">دخلت باسم <b dir="ltr" className="font-latin text-ink">{me.username}</b> · <span className={me.owner ? "text-amber-700" : ""}>{LEVELS[me.level]}</span>{me.level === "viewer" && " (مشاهدة فقط)"}{!me.owner && me.level !== "viewer" && me.perms?.length ? ` · ${me.perms.length} صلاحيات` : ""}</div>}
        </div>
        <div className="flex gap-2">
          {kvReady && examples !== null && (me.owner || me.perms?.includes("examples")) && (
            <button onClick={toggleExamples} disabled={exBusy} className={`rounded-xl px-4 py-2 text-sm ${examples ? "border border-red-200 bg-red-50 text-red-700" : "border border-sky-200 bg-sky-50 text-sky-800"}`}>
              {exBusy ? "…" : examples ? "حذف البيانات التجريبية" : "إضافة بيانات تجريبية"}
            </button>
          )}
          <a href="/" className="rounded-xl border border-line bg-white px-4 py-2 text-sm">فتح التطبيق</a>
          <button onClick={logout} className="rounded-xl bg-ink px-4 py-2 text-sm text-paper">خروج</button>
        </div>
      </div>
      {!kvReady && <div className="mb-4"><Problem text="قاعدة البيانات غير مربوطة: العملاء والتصاميم والإحصائيات لا تُحفظ بعد. اربط Upstash Redis من Vercel ← Storage ← Create Database، ثم أعد النشر." /></div>}
      {demoStore && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <b>وضع العرض:</b> قاعدة البيانات غير مربوطة بعد، فاللوحة تعرض 100 عميل تجريبي محفوظين مؤقتاً في ذاكرة الخادم لتشوف كيف تعمل كل الأقسام. تقدر تجرّب التفعيل والتجديد والحذف، لكن التغييرات قد ترجع لوضعها الأول عند إعادة تشغيل الخادم.
          تسجيل العملاء الحقيقيين متوقف حتى تربط Upstash Redis من Vercel ← Storage، وبعدها تُحذف هذه الأمثلة تلقائياً من العرض.
        </div>
      )}
      {me.owner && !ownerOk && tab !== "team" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>🔒 احمِ حسابك: فعّل رمز التحقق عند الدخول على جوالك أو إيميلك.</span>
          <button onClick={() => setTab("team")} className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white">فعّله الآن</button>
        </div>
      )}
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap px-3 py-2.5 text-sm ${tab === t.id ? "border-b-2 border-ember font-semibold text-ink" : "text-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </nav>
      {tab === "overview" && (kvReady ? <OverviewTab key={ver} /> : <Empty text="تظهر الإحصائيات بعد ربط قاعدة البيانات." />)}
      {tab === "payments" && (kvReady ? <PaymentsTab key={ver} /> : <Empty text="تظهر الطلبات بعد ربط قاعدة البيانات." />)}
      {tab === "customers" && (kvReady ? <CustomersTab key={ver} /> : <Empty text="يظهر العملاء بعد ربط قاعدة البيانات." />)}
      {tab === "designs" && (kvReady ? <DesignsTab key={ver} /> : <Empty text="تظهر التصاميم بعد ربط قاعدة البيانات." />)}
      {tab === "usage" && (kvReady ? <UsageTab key={ver} /> : <Empty text="يظهر الاستخدام بعد ربط قاعدة البيانات." />)}
      {tab === "settings" && me.owner && <SettingsTab rows={settings} />}
      {tab === "pricing" && (me.owner || me.perms?.includes("pricing")) && (kvReady ? <PricingTab onSaved={(p) => { setPrices(p); setVer((v) => v + 1); }} /> : <Empty text="تعديل الأسعار يحتاج ربط قاعدة البيانات." />)}
      {tab === "finance" && (me.owner || me.perms?.includes("finance")) && (kvReady ? <FinanceTab key={ver} /> : <Empty text="تظهر المالية بعد ربط قاعدة البيانات." />)}
      {tab === "team" && me.owner && (kvReady ? <TeamTab demo={demoStore} /> : <Empty text="إضافة أعضاء الفريق تحتاج ربط قاعدة البيانات (Upstash Redis)." />)}
      {extraTabs.map((t) => tab === t.id && <div key={t.id}>{t.node}</div>)}
    </main>
    </PricesCtx.Provider>
    </MeCtx.Provider>
  );
}
