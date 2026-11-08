import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (path !== "sign-in" && path !== "sign-up" && path !== "reset-password") notFound();
  return <AuthForm initialMode={path} />;
}
