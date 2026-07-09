import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireClientSession } from "@/lib/auth/session";
import { ClientDeclarantProfileView } from "@/components/client/client-declarant-profile-view";
import { PortalCustomerShell } from "@/components/portal/portal-customer-shell";
import { clientProfileBreadcrumbs } from "@/lib/client-breadcrumbs";
import { getClientProfile } from "@/lib/domain/clients";
import { CLIENT_ONBOARDING_HREF } from "@/lib/routing/portal-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";

export const clientProfilePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientProfile.title}`,
  description: portalCopy.metadata.clientProfile.description,
};

/** Shared page handler for `/client/profile`. */
export async function runClientProfilePage() {
  const copy = portalCopy.clientProfile;
  const session = await requireClientSession({ requireOnboarding: true });
  const profile = await getClientProfile(session.user.id);

  if (!profile) {
    redirect(CLIENT_ONBOARDING_HREF);
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
        email={session.user.email}
        profile={profile}
      />
    </PortalCustomerShell>
  );
}
