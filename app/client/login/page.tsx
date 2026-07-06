import { redirect } from "next/navigation";
import { ClientSignInForm } from "@/components/client-sign-in-form";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalNarrowShell } from "@/components/portal-narrow-shell";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { getClientProfile } from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientLoginPage() {
  const { clientAuth } = portalCopy;
  const { data: session } = await auth.getSession();

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  if (session?.user?.id) {
    const profile = await getClientProfile(session.user.id);
    redirect(profile?.onboardingComplete ? "/client" : "/client/onboarding");
  }

  return (
    <PortalNarrowShell centered>
      <div className="mx-auto w-full max-w-sm space-y-6">
        <header className="space-y-2">
          <PortalEyebrow>{clientAuth.eyebrow}</PortalEyebrow>
          <h1 className="portal-page-title">{clientAuth.title}</h1>
          <p className="portal-page-description">{clientAuth.description}</p>
        </header>
        <ClientSignInForm />
        <p className="text-center text-xs text-muted-foreground">
          {clientAuth.inviteHint}
        </p>
      </div>
    </PortalNarrowShell>
  );
}
