"use client";
// بطاقة الطاولة A6 برمز QR يفتح المنيو الرقمي
import type { MenuDoc } from "@/lib/types";
import { fontStack } from "@/lib/fonts";
import { bestTextOn } from "@/lib/color";
import { qrSvg } from "@/lib/qr";
import { Mark, onPrimaryTone } from "../brand-mark";
import { PatternLayer, Sheet, SPECS } from "./kit";

export function TableCard({ doc, url, guides, printId }: { doc: MenuDoc; url?: string; guides?: boolean; printId?: string }) {
  const p = doc.brand.palette, ty = doc.brand.typography, v = doc.venue;
  const onP = bestTextOn(p.primary.hex, p.neutralLight.hex, p.neutralDark.hex);
  const B = SPECS.tableCard.bleed;
  return (
    <Sheet spec={SPECS.tableCard} bg={p.neutralLight.hex} guides={guides} printId={printId}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", color: p.neutralDark.hex, fontFamily: fontStack(ty.arabicBody) }}>
        <div style={{ position: "relative", width: "100%", height: `${B + 38}mm`, background: p.primary.hex, color: onP, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2mm", paddingTop: `${B}mm` }}>
          <PatternLayer doc={doc} color={onP} opacity={0.14} scale={0.35} />
          <Mark doc={doc} tone={onPrimaryTone(doc)} size="15mm" style={{ position: "relative" }} />
          <div style={{ position: "relative", fontFamily: fontStack(ty.arabicHeading), fontWeight: 800, fontSize: "15pt" }}>{v.name}</div>
        </div>
        <div style={{ marginTop: "8mm", fontFamily: fontStack(ty.arabicHeading), fontWeight: 700, fontSize: "13pt" }}>امسح الرمز لعرض المنيو</div>
        <div style={{ fontFamily: fontStack(ty.englishBody), fontSize: "8pt", opacity: 0.65, letterSpacing: "0.08em" }} dir="ltr">SCAN TO VIEW THE MENU</div>
        <div style={{ marginTop: "5mm", width: "52mm", height: "52mm", padding: "3mm", background: "#fff", borderRadius: "3mm", border: `0.4mm solid ${p.neutralDark.hex}1A` }}>
          {url ? (
            <div className="svg-fit" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: qrSvg(url, { fg: p.neutralDark.hex, border: 0, ecc: "M" }) }} />
          ) : (
            <div style={{ width: "100%", height: "100%", border: `0.4mm dashed ${p.primary.hex}`, borderRadius: "2mm", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "8pt", color: p.primary.hex, padding: "4mm" }}>
              انشر المنيو الرقمي ليظهر رمز QR هنا
            </div>
          )}
        </div>
        <div style={{ position: "absolute", bottom: `${B + 7}mm`, fontSize: "7.5pt", opacity: 0.7, textAlign: "center", lineHeight: 1.7 }}>
          <div>{v.hours}</div>
          <div dir="ltr" style={{ fontFamily: fontStack(ty.englishBody) }}>{v.instagram}</div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${B + 2.5}mm`, background: p.accent.hex }} />
      </div>
    </Sheet>
  );
}
