"use client";
import { AccountModals } from "./account/account-modals";
import { AccountBar, DemoNotice } from "./account-bar";
import * as React from "react";
import { useMenu } from "@/store/menu-store";
import { Onboarding } from "./onboarding";
import { Studio } from "./studio/studio";
import { ExportOverlay, ExportStage } from "./studio/exporter";

function useMounted() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}

function AppMark() {
  // شعار سُفرة: سفرة دائرية من الأعلى بثلاثة أطباق
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#142019" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#d99a20" strokeWidth="2" />
      <circle cx="16" cy="11.2" r="2.4" fill="#f5f6f2" />
      <circle cx="11.8" cy="18.6" r="2.4" fill="#f5f6f2" />
      <circle cx="20.2" cy="18.6" r="2.4" fill="#f5f6f2" />
    </svg>
  );
}

export default function SufraApp() {
  const mounted = useMounted();
  const stage = useMenu((s) => s.stage);
  const doc = useMenu((s) => s.doc);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 h-16 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-3 px-5">
          <AppMark />
          <span className="font-display text-xl font-bold">سُفرة</span>
          <span className="hidden text-sm text-muted sm:inline">· منيو وهوية مطعمك ومقهاك</span>
          <div className="mr-auto"><AccountBar /></div>
        </div>
      </header>
      <DemoNotice text="أنت في الديمو: المعاينة مجانية بعلامة مائية، والتحميل والنشر بعد اختيار الباقة." />
      {mounted && (stage === "studio" && doc ? <Studio /> : <Onboarding />)}
      <ExportStage />
      <ExportOverlay />
      <AccountModals onOpenDesign={async (d) => { await useMenu.getState().loadSaved(d.id); }} />
    </div>
  );
}
