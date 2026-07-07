import { redirect } from "next/navigation";
import { ClientOnboardingContext } from "@/components/client-onboarding-context";
import { ClientOnboardingForm } from "@/components/client-onboarding-form";
import { ClientOnboardingProgress } from "@/components/client-onboarding-progress";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalTrustNotice } from "@/components/portal-trust-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClientSession } from "@/app/actions/client";
import {
  getClientInvitationByEmail,
  getClientProfile,
} from "@/lib/clients";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientOnboardingPage() {
  const { clientOnboarding } = portalCopy;
  const session = await requireClientSession();
  const profile = await getClientProfile(session.user.id);
  const email = session.user.email ?? "";
  const invitation = email ? await getClientInvitationByEmail(email) : null;
  const embed = await isPlaygroundEmbedRequest();

  const defaultFullLegalName =
    profile?.fullLegalName ??
    invitation?.fullName ??
    session.user.name ??
    "";

  if (profile?.onboardingComplete && !embed) {
    redirect("/client");
  }

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientOnboarding.eyebrow}
      title={clientOnboarding.title}
      description={clientOnboarding.description}
    >
      <div className="v-stack gap-6">
        <ClientOnboardingProgress />

        <ClientOnboardingContext />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{clientOnboarding.formTitle}</CardTitle>
            <div className="portal-prose">
              <p>{clientOnboarding.formDescription}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ClientOnboardingForm
              email={email}
              defaults={{
                ...profile,
                fullLegalName: defaultFullLegalName,
              }}
            />
          </CardContent>
        </Card>

        <PortalTrustNotice />
      </div>
    </PortalCustomerShell>
  );
}
