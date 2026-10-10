"use client";
// مكونات واجهة بنمط shadcn/ui (مكتوبة محلياً بـ Tailwind، قابلة للاستبدال بـ npx shadcn add)
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

type BtnVariant = "primary" | "ember" | "outline" | "ghost" | "soft";
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" | "icon" }
>(({ className, variant = "primary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]",
      {
        primary: "bg-ink text-paper hover:bg-ink-soft",
        ember: "bg-ember text-white hover:bg-ember-deep shadow-[0_6px_20px_-8px_rgb(154_102_8/0.6)]",
        outline: "border border-line bg-white/60 hover:bg-white hover:border-ink/30",
        ghost: "hover:bg-ink/5",
        soft: "bg-ink/5 hover:bg-ink/10",
      }[variant],
      { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "h-9 w-9" }[size],
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition placeholder:text-muted/60",
      "focus:border-ink/40 focus:ring-4 focus:ring-ink/5",
      className,
    )}
    {...p}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-muted/60",
        "focus:border-ink/40 focus:ring-4 focus:ring-ink/5 resize-none",
        className,
      )}
      {...p}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Label({ children, hint, required, className }: { children: React.ReactNode; hint?: string; required?: boolean; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-baseline justify-between gap-2", className)}>
      <span className="text-sm font-semibold text-ink">
        {children}
        {required && <span className="ms-1 text-ember">*</span>}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Chip({
  active, onClick, children, disabled, className,
}: { active?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-all",
        active ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink/40",
        disabled && !active && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white", className)} {...p}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-medium tracking-wide text-ember">{eyebrow}</div>}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "ember" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        { neutral: "bg-ink/5 text-ink", ok: "bg-ok/10 text-ok", warn: "bg-warn/15 text-warn", bad: "bg-red-100 text-red-700", ember: "bg-ember-soft text-ember-deep" }[tone],
      )}
    >
      {children}
    </span>
  );
}

/** عرض SVG نصي داخل حاوية */
export function SvgBox({ svg, className, ...rest }: { svg: string } & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">) {
  return <div className={cn("svg-fit", className)} {...rest} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Segmented<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-white p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition whitespace-nowrap",
            value === o.id ? "bg-ink text-paper" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
