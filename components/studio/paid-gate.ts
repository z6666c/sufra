"use client";
// قفل النشر والتحميل: تسجيل + حفظ المنيو + دفع
import { useMenu } from "@/store/menu-store";
import { ensurePaid } from "../account/account-client";

export function paidGate(reason = "لتحميل ملفات مطعمك.") {
  return ensurePaid(async () => {
    const r = await useMenu.getState().saveToAccount();
    return r.ok ? useMenu.getState().saved?.id : undefined;
  }, reason);
}
