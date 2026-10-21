// تطبيقات المتجر (آيفون وأندرويد): الموقع نفسه داخل غلاف Capacitor
// - storeApp(): داخل تطبيق المتجر → نخفي الأسعار والشراء (الشراء من الموقع فقط)
// - saveFile(): حفظ الملفات ومشاركتها من الجوال (الروابط العادية ما تنزّل داخل التطبيق)
type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Record<string, any> };
const cap = (): Cap | undefined => (typeof window !== "undefined" ? (window as unknown as { Capacitor?: Cap }).Capacitor : undefined);
export const nativeApp = () => !!cap()?.isNativePlatform?.();
export const storeApp = () => nativeApp() || (typeof navigator !== "undefined" && /\b(HawiyatApp|SufraApp)\//.test(navigator.userAgent));
export const appPlatform = () => cap()?.getPlatform?.() ?? "web";

const toBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});

/** يحفظ الملف في الجوال ويفتح نافذة المشاركة (حفظ في الملفات، واتساب، إيميل...) */
export async function saveFile(blob: Blob, filename: string): Promise<boolean> {
  const P = cap()?.Plugins;
  if (!nativeApp() || !P?.Filesystem || !P?.Share) return false;
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "_");
  const r = await P.Filesystem.writeFile({ path: safe, data: await toBase64(blob), directory: "CACHE" });
  await P.Share.share({ title: safe, url: r.uri, files: [r.uri], dialogTitle: "حفظ أو مشاركة الملف" });
  return true;
}
