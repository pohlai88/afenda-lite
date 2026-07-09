import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import {
  PortalProfileField,
  PortalProfileFieldGroup,
} from "@/components/portal/portal-profile-field";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClientProfile } from "@/lib/domain/clients";
import { countryLabel } from "@/lib/countries";
import { formatDateTime } from "@/lib/format";
import { portalCopy } from "@/lib/copy/portal-copy";

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <PortalFormSection title={title} description={description}>
      <PortalProfileFieldGroup>{children}</PortalProfileFieldGroup>
    </PortalFormSection>
  );
}

function formatCountryValue(code: string | null | undefined) {
  if (!code) return null;
  return `${countryLabel(code)} (${code})`;
}

function formatSummarySecondary(profile: ClientProfile) {
  const parts = [profile.entityName, profile.jurisdiction].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ClientDeclarantProfileView({
  email,
  profile,
}: {
  email: string;
  profile: ClientProfile;
}) {
  const onboarding = portalCopy.clientOnboarding;
  const copy = portalCopy.clientProfile;
  const additionalResidence = profile.additionalResidenceCountries
    .map(countryLabel)
    .join(", ");
  const summarySecondary = formatSummarySecondary(profile);

  return (
    <div className="v-stack gap-6">
      <Alert className="border-muted-foreground/20 bg-muted/30">
        <InfoIcon aria-hidden className="size-4 text-muted-foreground" />
        <AlertDescription className="text-pretty text-foreground">
          {copy.correctionNotice}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-xl font-semibold">
            {profile.fullLegalName ?? email}
          </CardTitle>
          {summarySecondary ? (
            <CardDescription className="text-pretty">
              {summarySecondary}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{email}</p>
          <p className="mt-1">
            Last updated {formatDateTime(profile.updatedAt)}
          </p>
        </CardContent>
      </Card>

      <ProfileSection
        title={onboarding.credentialsSectionTitle}
        description={onboarding.credentialsSectionDescription}
      >
        <PortalProfileField label={onboarding.emailLabel} value={email} />
      </ProfileSection>

      <ProfileSection
        title={onboarding.identitySectionTitle}
        description={onboarding.identitySectionDescription}
      >
        <PortalProfileField
          label={onboarding.fullLegalNameLabel}
          value={profile.fullLegalName}
        />
        <PortalProfileField
          label={onboarding.nationalityLabel}
          value={formatCountryValue(profile.nationality)}
        />
        <PortalProfileField
          label={onboarding.countryOfResidenceLabel}
          value={formatCountryValue(profile.countryOfResidence)}
        />
        <PortalProfileField
          label={onboarding.additionalResidenceLabel}
          value={additionalResidence || null}
        />
      </ProfileSection>

      <ProfileSection
        title={onboarding.passportSectionTitle}
        description={onboarding.passportSectionDescription}
      >
        <PortalProfileField
          label={onboarding.passportCountryLabel}
          value={formatCountryValue(profile.passportIssuingCountry)}
        />
        <PortalProfileField
          label={onboarding.passportNumberLabel}
          value={profile.passportNumber}
        />
      </ProfileSection>

      <ProfileSection
        title={onboarding.entitySectionTitle}
        description={onboarding.entitySectionDescription}
      >
        <PortalProfileField
          label={onboarding.entityLabel}
          value={profile.entityName}
        />
        <PortalProfileField
          label={onboarding.jurisdictionLabel}
          value={profile.jurisdiction}
        />
      </ProfileSection>

      <ProfileSection
        title={onboarding.contactSectionTitle}
        description={onboarding.contactSectionDescription}
      >
        <PortalProfileField label={onboarding.phoneLabel} value={profile.phone} />
        <PortalProfileField
          label={onboarding.notesLabel}
          value={profile.notes}
          colSpan={2}
        />
      </ProfileSection>
    </div>
  );
}
