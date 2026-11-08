import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return <OnboardingForm name={session.user.name ?? ""} email={session.user.email} />;
}
