import type { Metadata } from "next";
import { Readex_Pro, Tajawal, IBM_Plex_Sans_Arabic, Inter, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// الخطوط مستضافة ذاتياً عبر next/font لضمان تضمينها في ملفات PNG/PDF المصدّرة
const readex = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-readex-pro", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800"], variable: "--font-tajawal", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-plex-arabic", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "سُفرة — منيو وهوية مطعمك",
  description: "منيو رقمي بـ QR ومنيو مطبوع ومنشورات سوشيال لمطعمك أو مقهاك خلال دقائق",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [readex, tajawal, plexArabic, inter, outfit, jakarta].map((f) => f.variable).join(" ");
  return (
    <html lang="ar" dir="rtl" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
