import { redirect } from "next/navigation";
import { ClientOnboardingForm } from "@/components/client-onboarding-form";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClientSession } from "@/app/actions/client";
import { getClientProfile } from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientOnboardingPage() {
  const { clientOnboarding } = portalCopy;
  const session = await requireClientSession();
  const profile = await getClientProfile(session.user.id);

  if (profile?.onboardingComplete) {
    redirect("/client");
  }

  return (
    <PortalCustomerShell
      eyebrow={clientOnboarding.eyebrow}
      title={clientOnboarding.title}
      description={clientOnboarding.description}
    >
      <Card>
        <CardHeader>
          <CardTitle>{clientOnboarding.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientOnboardingForm defaults={profile ?? undefined} />
        </CardContent>
      </Card>
    </PortalCustomerShell>
  );
}
