import { accounts, authSecret, demoCredentials, publicDemo } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const status = {
    secret: !!authSecret(),
    admin: accounts().some((a) => a.role === "admin"),
    publicDemo: publicDemo(),
  };
  return <LoginForm demo={demoCredentials()} status={status} next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />;
}
