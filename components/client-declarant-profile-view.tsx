import type { ReactNode } from "react";
import type { ClientProfile } from "@/lib/clients";
import { countryLabel } from "@/lib/countries";
import { portalCopy } from "@/lib/portal-copy";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

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
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-pretty">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
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

  return (
    <div className="v-stack gap-6">
      <p className="text-sm text-muted-foreground text-pretty">
        {copy.correctionNotice}
      </p>

      <ProfileSection
        title={onboarding.credentialsSectionTitle}
        description={onboarding.credentialsSectionDescription}
      >
        <ProfileField label={onboarding.emailLabel} value={email} />
      </ProfileSection>

      <ProfileSection
        title={onboarding.identitySectionTitle}
        description={onboarding.identitySectionDescription}
      >
        <ProfileField
          label={onboarding.fullLegalNameLabel}
          value={profile.fullLegalName}
        />
        <ProfileField
          label={onboarding.nationalityLabel}
          value={
            profile.nationality
              ? `${countryLabel(profile.nationality)} (${profile.nationality})`
              : null
          }
        />
        <ProfileField
          label={onboarding.countryOfResidenceLabel}
          value={
            profile.countryOfResidence
              ? `${countryLabel(profile.countryOfResidence)} (${profile.countryOfResidence})`
              : null
          }
        />
        {additionalResidence ? (
          <ProfileField
            label={onboarding.additionalResidenceLabel}
            value={additionalResidence}
          />
        ) : null}
      </ProfileSection>

      <ProfileSection
        title={onboarding.passportSectionTitle}
        description={onboarding.passportSectionDescription}
      >
        <ProfileField
          label={onboarding.passportCountryLabel}
          value={
            profile.passportIssuingCountry
              ? `${countryLabel(profile.passportIssuingCountry)} (${profile.passportIssuingCountry})`
              : null
          }
        />
        <ProfileField
          label={onboarding.passportNumberLabel}
          value={profile.passportNumber}
        />
      </ProfileSection>

      <ProfileSection
        title={onboarding.entitySectionTitle}
        description={onboarding.entitySectionDescription}
      >
        <ProfileField label={onboarding.entityLabel} value={profile.entityName} />
        <ProfileField
          label={onboarding.jurisdictionLabel}
          value={profile.jurisdiction}
        />
      </ProfileSection>

      <ProfileSection
        title={onboarding.contactSectionTitle}
        description={onboarding.contactSectionDescription}
      >
        <ProfileField label={onboarding.phoneLabel} value={profile.phone} />
        {profile.notes ? (
          <div className="sm:col-span-2">
            <ProfileField label={onboarding.notesLabel} value={profile.notes} />
          </div>
        ) : null}
      </ProfileSection>
    </div>
  );
}
