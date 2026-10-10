"use client";
export function LogoutButton() {
  return (
    <button
      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
      className="rounded-xl bg-ink px-4 py-2 text-sm text-paper"
    >
      خروج
    </button>
  );
}
