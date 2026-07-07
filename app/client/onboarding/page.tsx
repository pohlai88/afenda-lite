import { redirect } from "next/navigation";
import { ClientOnboardingContext } from "@/components/client-onboarding-context";
import { ClientOnboardingForm } from "@/components/client-onboarding-form";
import { ClientOnboardingProgress } from "@/components/client-onboarding-progress";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalFormSection } from "@/components/portal-form-section";
import { PortalTrustNotice } from "@/components/portal-trust-notice";
import { requireClientSession } from "@/app/actions/client";
import {
  getClientInvitationByEmail,
  getClientProfile,
} from "@/lib/clients";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { portalCopy } from "@/lib/portal-copy";
import { debugAgentLog } from "@/lib/debug-agent-log";

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

  const formDefaults = {
    fullLegalName: defaultFullLegalName,
    nationality: profile?.nationality ?? null,
    countryOfResidence: profile?.countryOfResidence ?? null,
    additionalResidenceCountries: profile?.additionalResidenceCountries ?? [],
    passportIssuingCountry: profile?.passportIssuingCountry ?? null,
    passportNumber: profile?.passportNumber ?? null,
    phone: profile?.phone ?? null,
    entityName: profile?.entityName ?? null,
    jurisdiction: profile?.jurisdiction ?? null,
    notes: profile?.notes ?? null,
  };

  debugAgentLog({
    location: "app/client/onboarding/page.tsx",
    message: "rendering onboarding form defaults",
    hypothesisId: "B",
    data: {
      profileExists: Boolean(profile),
      defaultKeys: Object.keys(formDefaults),
      dateFieldTypes: Object.fromEntries(
        Object.entries(formDefaults).map(([key, value]) => [
          key,
          value instanceof Date ? "Date" : typeof value,
        ]),
      ),
    },
  });

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

        <PortalFormSection
          title={clientOnboarding.formTitle}
          description={clientOnboarding.formDescription}
        >
          <ClientOnboardingForm
            email={email}
            defaults={formDefaults}
          />
        </PortalFormSection>

        <PortalTrustNotice />
      </div>
    </PortalCustomerShell>
  );
}
