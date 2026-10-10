// تجربة محلية فقط: بديل خفيف لـ framer-motion (يعرض العناصر بدون حركة)
import * as React from "react";
const STRIP = new Set(["initial", "animate", "exit", "transition", "layout", "layoutId", "custom", "whileHover", "whileTap", "variants"]);
const cache: Record<string, unknown> = {};
export const motion: Record<string, React.ComponentType<any>> = new Proxy({}, {
  get(_t, tag: string) {
    if (!cache[tag]) {
      const C = React.forwardRef<any, any>((props, ref) => {
        const clean: Record<string, unknown> = {};
        for (const k in props) if (!STRIP.has(k)) clean[k] = props[k];
        return React.createElement(tag, { ...clean, ref });
      });
      C.displayName = `motion.${tag}`;
      cache[tag] = C;
    }
    return cache[tag];
  },
}) as never;
export function AnimatePresence({ children }: { children?: React.ReactNode; mode?: string; custom?: unknown }) {
  return <>{children}</>;
}
