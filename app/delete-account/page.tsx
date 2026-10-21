import { LegalPage, APP_NAME, supportEmail } from "@/components/legal/legal-page";
import { DeleteAccountBox } from "@/components/legal/delete-account-box";

export const metadata = { title: `حذف الحساب — ${APP_NAME}` };

export default function DeleteAccount() {
  return (
    <LegalPage title="حذف الحساب">
      <p>تقدر تحذف حسابك في {APP_NAME} وكل تصاميمك وبياناتك نهائياً في أي وقت.</p>
      <h2>من التطبيق أو الموقع</h2>
      <ol className="ms-5 list-decimal space-y-1"><li>سجّل دخولك.</li><li>افتح «تصاميمي».</li><li>اضغط «حذف حسابي» ثم «نعم، احذف حسابي».</li></ol>
      <h2>من هنا مباشرة</h2>
      <DeleteAccountBox />
      <h2>وش ينحذف</h2>
      <p>بريدك أو جوالك، وكل تصاميمك (المدفوعة وغير المدفوعة){(APP_NAME as string) === "سُفرة" ? "، وروابط المنيو المنشورة" : ""}. الحذف فوري ونهائي. سجلات الدفع المالية نحتفظ فيها فقط بالقدر اللي يفرضه النظام.</p>
      <p>ما تقدر تدخل؟ راسلنا من بريدك المسجّل على <a href={`mailto:${supportEmail()}?subject=${encodeURIComponent("طلب حذف حساب")}`} className="underline" dir="ltr">{supportEmail()}</a> ونحذفه خلال 7 أيام.</p>
    </LegalPage>
  );
}
