"use client";

import { useState } from "react";
import { ClientOnboardingContext } from "@/components/client/client-onboarding-context";
import { ClientOnboardingForm } from "@/components/client/client-onboarding-form";
import { ClientOnboardingProgress } from "@/components/client/client-onboarding-progress";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import {
  CLIENT_ONBOARDING_FORM_STEPS,
  type ClientOnboardingFormDefaults,
} from "@/lib/client-onboarding";
import { portalCopy } from "@/lib/copy/portal-copy";

export { CLIENT_ONBOARDING_FORM_STEPS };

export function ClientOnboardingWizard({
  email,
  defaults,
}: {
  email: string;
  defaults?: ClientOnboardingFormDefaults;
}) {
  const { clientOnboarding } = portalCopy;
  const [stepIndex, setStepIndex] = useState(0);

  return (
    <>
      <ClientOnboardingProgress
        formStep={stepIndex + 1}
        formStepCount={CLIENT_ONBOARDING_FORM_STEPS}
      />

      <ClientOnboardingContext />

      <PortalFormSection
        title={clientOnboarding.formTitle}
        description={clientOnboarding.formDescription}
      >
        <ClientOnboardingForm
          email={email}
          defaults={defaults}
          stepIndex={stepIndex}
          stepCount={CLIENT_ONBOARDING_FORM_STEPS}
          onStepChange={setStepIndex}
        />
      </PortalFormSection>
    </>
  );
}
