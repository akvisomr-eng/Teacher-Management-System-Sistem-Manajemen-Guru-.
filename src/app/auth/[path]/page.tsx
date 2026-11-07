import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (path !== "sign-in" && path !== "sign-up") notFound();
  return <AuthForm initialMode={path} />;
}
