import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientPortalLoginPage } from "@/components/client-portal-login-page";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { getClientProfile } from "@/lib/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.home.title}`,
  description: portalCopy.metadata.home.description,
};

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  if (session?.user?.id) {
    const profile = await getClientProfile(session.user.id);
    redirect(profile?.onboardingComplete ? "/client" : "/client/onboarding");
  }

  return (
    <main>
      <ClientPortalLoginPage />
    </main>
  );
}
