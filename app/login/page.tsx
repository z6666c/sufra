import { demoCredentials } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm demo={demoCredentials()} next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />;
}
