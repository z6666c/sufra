// صفحات قانونية عامة (مطلوبة لمتاجر التطبيقات): الخصوصية، الشروط، حذف الحساب
export const APP_NAME = "سُفرة";
export const APP_NAME_EN = "Sufra";
export const legalName = () => process.env.NEXT_PUBLIC_LEGAL_NAME || "سُفرة";
export const supportEmail = () => process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";
export const UPDATED = "21 أكتوبر 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[15px] leading-loose text-ink">
      <a href="/" className="text-sm text-muted hover:text-ink">← {APP_NAME}</a>
      <h1 className="mb-1 mt-4 font-display text-3xl font-bold">{title}</h1>
      <p className="mb-8 text-xs text-muted">آخر تحديث: {UPDATED}</p>
      <div className="space-y-5 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ms-5 [&_li]:list-disc">{children}</div>
      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
        <a href="/privacy" className="hover:text-ink">سياسة الخصوصية</a> · <a href="/terms" className="hover:text-ink">شروط الاستخدام</a> · <a href="/delete-account" className="hover:text-ink">حذف الحساب</a>
      </footer>
    </main>
  );
}
