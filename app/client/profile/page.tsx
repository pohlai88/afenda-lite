import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireClientSession } from "@/app/actions/client";
import { ClientDeclarantProfileView } from "@/components/client-declarant-profile-view";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { clientProfileBreadcrumbs } from "@/lib/client-breadcrumbs";
import { getClientProfile } from "@/lib/clients";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.clientProfile.title}`,
  description: portalCopy.clientProfile.description,
};

export default async function ClientProfilePage() {
  const copy = portalCopy.clientProfile;
  const session = await requireClientSession({ requireOnboarding: true });
  const profile = await getClientProfile(session.user.id);
  const embed = await isPlaygroundEmbedRequest();

  if (!profile?.onboardingComplete && !embed) {
    redirect("/client/onboarding");
  }

  if (!profile) {
    redirect("/client/onboarding");
  }

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      breadcrumbs={clientProfileBreadcrumbs()}
    >
      <ClientDeclarantProfileView
        email={session.user.email ?? ""}
        profile={profile}
      />
    </PortalCustomerShell>
  );
}
