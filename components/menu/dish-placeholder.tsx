// صورة بديلة للصنف عند عدم وجود صورة: الحرف الأول من اسمه على لون الهوية
import type { Palette } from "@/lib/types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function dishSvg(palette: Palette, label = "", font = "sans-serif"): string {
  const letter = esc(Array.from(label.trim())[0] ?? "•");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="100" height="100" fill="${palette.neutralLight.hex}"/>` +
    `<rect width="100" height="100" fill="${palette.primary.hex}" opacity="0.1"/>` +
    `<circle cx="50" cy="50" r="31" fill="none" stroke="${palette.primary.hex}" stroke-opacity="0.18" stroke-width="1"/>` +
    `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" fill="${palette.primary.hex}" fill-opacity="0.55" style="font-family:${esc(font).replace(/&quot;/g, "'")};font-weight:700;font-size:34px">${letter}</text>` +
    `</svg>`
  );
}

export function DishImage({ src, palette, label, font, radius = 12, style }: { src?: string; palette: Palette; label?: string; font?: string; radius?: number; style?: React.CSSProperties }) {
  const box: React.CSSProperties = { borderRadius: radius, overflow: "hidden", flexShrink: 0, background: palette.neutralLight.hex, ...style };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={{ ...box, objectFit: "cover", display: "block" }} />;
  }
  return <div className="svg-fit" style={box} dangerouslySetInnerHTML={{ __html: dishSvg(palette, label, font) }} />;
}
