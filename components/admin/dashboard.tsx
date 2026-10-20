"use client";
// لوحة الإدارة الكاملة: نظرة عامة، العملاء، التصاميم، الاستخدام والتكاليف، الإعدادات
import * as React from "react";
import { PLANS, type PlanKind } from "@/lib/plans";

type Customer = { id: string; email?: string; phone?: string; name?: string; status: "trial" | "paid"; createdAt: number; lastLoginAt: number; trialEndsAt: number; note?: string; designs: number; example?: boolean };
type Paid = { plan: PlanKind; at: number; amount: number; until?: number | null; ref?: string; by?: string } | null;
export type AdminMe = { username: string; owner: boolean; level: "owner" | "manager" | "viewer" };
const MeCtx = React.createContext<AdminMe>({ username: "", owner: true, level: "owner" });
const useCanWrite = () => React.useContext(MeCtx).level !== "viewer";
const useIsOwner = () => React.useContext(MeCtx).owner;
const LEVELS: Record<AdminMe["level"], string> = { owner: "المالك", manager: "مشرف", viewer: "مشاهد" };
type Design = { id: string; customerId: string; owner?: string; title: string; kind: string; createdAt: number; updatedAt: number; expiresAt: number | null; size: number; paid?: Paid; paymentRequestedAt?: number | null; requestedPlan?: PlanKind | null; example?: boolean };
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
  const canWrite = useCanWrite(); const isOwner = useIsOwner();
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
  const canWrite = useCanWrite();
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
  const canWrite = useCanWrite();
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
      <button disabled={busy} onClick={() => go({ action: "paid", plan: "once" }, `رقم العملية أو التحويل (اختياري) — ${PLANS.once.price} ر.س`)} className={`rounded-lg px-2 py-1 text-xs text-white ${d.requestedPlan === "once" ? "bg-emerald-600" : "bg-emerald-600/80"}`}>تفعيل مرة واحدة {PLANS.once.price}</button>
      <button disabled={busy} onClick={() => go({ action: "paid", plan: "monthly" }, `رقم العملية أو التحويل (اختياري) — ${PLANS.monthly.price} ر.س`)} className={`rounded-lg px-2 py-1 text-xs text-white ${d.requestedPlan === "monthly" ? "bg-sky-700" : "bg-sky-700/80"}`}>تفعيل شهري {PLANS.monthly.price}</button>
    </>
  );
}

function PaymentsTab() {
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
              <td className="p-3 font-medium">{d.title}{d.example && <span className="ms-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800">مثال</span>}</td>
              <td className="p-3 text-xs" dir="ltr" style={{ textAlign: "right" }}>{d.owner}</td>
              <td className="p-3 text-xs">{kind === "pending" ? `${planLabel(d.requestedPlan)} · ${d.requestedPlan === "monthly" ? PLANS.monthly.price : PLANS.once.price} ر.س` : <PayStatus d={d} />}</td>
              <td className="p-3 text-xs text-muted">{kind === "pending" ? new Date(d.paymentRequestedAt!).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : `${fmt(d.paid!.amount)} ر.س · ${date(d.paid!.at)}${d.paid!.ref ? ` · ${d.paid!.ref}` : ""}${d.paid!.by ? ` · بواسطة ${d.paid!.by}` : ""}`}</td>
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
        حتى ربط بوابة الدفع: العميل يختار باقته ويضغط «اختر هذه الباقة» فيظهر طلبه هنا. بعد استلام المبلغ (تحويل بنكي مثلاً) اضغط «تفعيل» ليُفتح له التحميل{PLANS.once.months ? " والنشر" : ""} فوراً. الشهري يمتد شهراً من تاريخ التفعيل ويُجدَّد بزر «تجديد شهر».
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
type Member = { username: string; name: string; level: "manager" | "viewer"; disabled?: boolean; createdAt: number; lastLoginAt?: number };
function TeamTab() {
  const [data, setData] = React.useState<{ owner: string; members: Member[] } | null>(null);
  const [err, setErr] = React.useState("");
  const [form, setForm] = React.useState({ username: "", name: "", password: genPassword(), level: "manager" as Member["level"] });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ username: string; password: string } | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api<{ owner: string; members: Member[] }>("/api/admin/team").then(setData).catch((e) => setErr(e.message)); }, []);
  React.useEffect(() => { load(); }, [load]);
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setErr("");
    try { await fn(); load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    run("add", async () => {
      await api("/api/admin/team", { method: "POST", body: JSON.stringify(form) });
      setCreated({ username: form.username.trim().toLowerCase(), password: form.password });
      setForm({ username: "", name: "", password: genPassword(), level: "manager" });
    });
  };
  const patch = (u: string, body: object) => run(u, () => api(`/api/admin/team/${encodeURIComponent(u)}`, { method: "PATCH", body: JSON.stringify(body) }));
  const resetPw = (u: string) => {
    const pw = genPassword();
    run(u, async () => { await api(`/api/admin/team/${encodeURIComponent(u)}`, { method: "PATCH", body: JSON.stringify({ password: pw }) }); setCreated({ username: u, password: pw }); });
  };
  if (!data && !err) return <Loading />;
  const inp = "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-ink/40";
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
        أضف من يساعدك في الإدارة. <b>الملكية لك وحدك</b>: حسابك (المالك) ثابت من إعدادات الخادم ولا يقدر أحد يعدّله أو يحذفه، وإضافة الأعضاء وحذفهم وحذف العملاء لك فقط.
        <br />• <b>مشرف</b>: يشوف كل شيء ويفعّل الطلبات ويجدد ويدير العملاء والتصاميم. • <b>مشاهد</b>: يشوف فقط بدون أي تعديل.
        <br />تغيير الصلاحية أو كلمة المرور أو الإيقاف يُخرج العضو من جلسته فوراً.
      </div>
      {err && <Problem text={err} />}
      {created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          أرسل للعضو بيانات الدخول (تظهر مرة واحدة فقط): رابط الدخول <b dir="ltr">{typeof window !== "undefined" ? `${location.origin}/login` : "/login"}</b> · اسم المستخدم <b dir="ltr" className="font-latin">{created.username}</b> · كلمة المرور <b dir="ltr" className="font-latin">{created.password}</b>
          <button onClick={() => { navigator.clipboard?.writeText(`${location.origin}/login\n${created.username}\n${created.password}`).catch(() => {}); }} className="ms-2 rounded-lg border border-emerald-300 bg-white px-2 py-0.5 text-xs">نسخ</button>
          <button onClick={() => setCreated(null)} className="ms-1 rounded-lg px-2 py-0.5 text-xs">إخفاء</button>
        </div>
      )}
      <form onSubmit={add} className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-[1fr_1fr_1.2fr_auto_auto] md:items-end">
        <label className="text-xs text-muted">اسم المستخدم (إنجليزي)<input required dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="sara" className={inp} /></label>
        <label className="text-xs text-muted">الاسم<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="سارة" className={inp} /></label>
        <label className="text-xs text-muted">كلمة المرور
          <span className="flex gap-1"><input required minLength={8} dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp + " font-latin"} />
            <button type="button" onClick={() => setForm({ ...form, password: genPassword() })} className="h-10 shrink-0 rounded-xl border border-line px-2 text-xs">توليد</button></span>
        </label>
        <label className="text-xs text-muted">الصلاحية
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Member["level"] })} className={inp}>
            <option value="manager">مشرف</option><option value="viewer">مشاهد</option>
          </select>
        </label>
        <button disabled={busy === "add"} className="h-10 rounded-xl bg-ink px-4 text-sm text-paper">{busy === "add" ? "…" : "إضافة عضو"}</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted"><tr className="border-b border-line text-right">
            <th className="p-3 font-medium">العضو</th><th className="p-3 font-medium">الصلاحية</th><th className="p-3 font-medium">الحالة</th><th className="p-3 font-medium">آخر دخول</th><th className="p-3" />
          </tr></thead>
          <tbody>
            <tr className="border-b border-line bg-amber-50/40">
              <td className="p-3 font-medium"><span dir="ltr" className="font-latin">{data?.owner}</span> <span className="text-xs text-muted">(أنت)</span></td>
              <td className="p-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">المالك</span></td>
              <td className="p-3 text-xs text-muted">ثابت — يُدار من إعدادات الخادم</td><td className="p-3" /><td className="p-3" />
            </tr>
            {data?.members.map((m) => (
              <tr key={m.username} className="border-b border-line last:border-0">
                <td className="p-3"><div className="font-medium">{m.name}</div><div dir="ltr" className="text-right font-latin text-xs text-muted">{m.username}</div></td>
                <td className="p-3">
                  <select disabled={busy === m.username} value={m.level} onChange={(e) => patch(m.username, { level: e.target.value })} className="rounded-lg border border-line bg-white px-2 py-1 text-xs">
                    <option value="manager">مشرف</option><option value="viewer">مشاهد</option>
                  </select>
                </td>
                <td className="p-3 text-xs">{m.disabled ? <span className="font-semibold text-red-600">موقوف</span> : <span className="text-emerald-700">فعّال</span>}</td>
                <td className="p-3 text-xs text-muted">{m.lastLoginAt ? date(m.lastLoginAt) : "لم يدخل بعد"}</td>
                <td className="p-3 text-left">
                  <span className="inline-flex flex-wrap justify-end gap-1">
                    <button disabled={busy === m.username} onClick={() => resetPw(m.username)} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">كلمة مرور جديدة</button>
                    <button disabled={busy === m.username} onClick={() => patch(m.username, { disabled: !m.disabled })} className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-ink/5">{m.disabled ? "تفعيل" : "إيقاف"}</button>
                    {confirm === m.username
                      ? <button onClick={() => { setConfirm(null); run(m.username, () => api(`/api/admin/team/${encodeURIComponent(m.username)}`, { method: "DELETE" })); }} className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white">تأكيد الحذف</button>
                      : <button onClick={() => setConfirm(m.username)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">حذف</button>}
                  </span>
                </td>
              </tr>
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

const USAGE_LABEL: Record<string, string> = {
  ai_logos: "دفعات شعارات بالذكاء الاصطناعي", ai_logo_image: "شعارات Recraft (لكل شعار)", ai_identity: "صياغة هوية / شعارات Gemini",
  name_check: "فحص أسماء", menu_ai: "اقتراحات منيو", dish_photo: "صور أطباق", publish: "نشر منيو", payment_request: "طلبات تفعيل", payment: "عمليات دفع",
  otp_email: "رموز تحقق بالبريد", otp_sms: "رموز تحقق بالجوال", design_save: "حفظ تصاميم", login: "دخول عملاء", signup: "تسجيلات جديدة",
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
    ...(me.owner ? [{ id: "finance", label: "المالية" }, { id: "team", label: "الفريق" }, { id: "settings", label: "الإعدادات" }] : []),
  ];
  const [tab, setTab] = React.useState("overview");
  const [ver, setVer] = React.useState(0);
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted">{brand}</div>
          <h1 className="font-display text-2xl font-bold">لوحة التحكم</h1>
          {me.username && <div className="mt-1 text-xs text-muted">دخلت باسم <b dir="ltr" className="font-latin text-ink">{me.username}</b> · <span className={me.owner ? "text-amber-700" : ""}>{LEVELS[me.level]}</span>{me.level === "viewer" && " (مشاهدة فقط)"}</div>}
        </div>
        <div className="flex gap-2">
          {kvReady && examples !== null && me.level !== "viewer" && (
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
      {tab === "finance" && me.owner && (kvReady ? <FinanceTab key={ver} /> : <Empty text="تظهر المالية بعد ربط قاعدة البيانات." />)}
      {tab === "team" && me.owner && (kvReady && !demoStore ? <TeamTab /> : <Empty text="إضافة أعضاء الفريق تحتاج ربط قاعدة البيانات (Upstash Redis)." />)}
      {extraTabs.map((t) => tab === t.id && <div key={t.id}>{t.node}</div>)}
    </main>
    </MeCtx.Provider>
  );
}
