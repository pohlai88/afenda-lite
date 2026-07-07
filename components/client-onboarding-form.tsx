"use client";

import { useState, useTransition } from "react";
import { saveClientOnboardingAction } from "@/app/actions/client";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PortalFormField } from "@/components/portal-form-field";
import {
  CLIENT_ONBOARDING_FORM_STEPS,
  type ClientOnboardingFormDefaults,
} from "@/lib/client-onboarding";
import {
  ISO_COUNTRY_CODES,
  ISO_COUNTRY_LABELS,
  type IsoCountryCode,
} from "@/lib/countries";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const inputClassName = "min-h-11 touch-manipulation";
const selectClassName =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation";

function CountrySelect({
  id,
  name,
  defaultValue,
  required,
  placeholder,
  describedBy,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder: string;
  describedBy?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      aria-describedby={describedBy}
      className={selectClassName}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {ISO_COUNTRY_CODES.map((code) => (
        <option key={code} value={code}>
          {ISO_COUNTRY_LABELS[code as IsoCountryCode]} ({code})
        </option>
      ))}
    </select>
  );
}

export function ClientOnboardingForm({
  email,
  defaults,
  stepIndex = 0,
  stepCount = CLIENT_ONBOARDING_FORM_STEPS,
  onStepChange,
}: {
  email: string;
  defaults?: ClientOnboardingFormDefaults;
  stepIndex?: number;
  stepCount?: number;
  onStepChange?: (step: number) => void;
}) {
  const { clientOnboarding } = portalCopy;
  const [error, setError] = useState<string | null>(null);
  const [identityConsent, setIdentityConsent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedAdditional = new Set(defaults?.additionalResidenceCountries ?? []);
  const isLastStep = stepIndex >= stepCount - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (!isLastStep) {
          const currentStep = event.currentTarget.querySelector<HTMLElement>(
            `[data-step="${stepIndex}"]`,
          );
          const invalid = currentStep?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            ":invalid",
          );
          if (invalid) {
            invalid.reportValidity();
            return;
          }
          onStepChange?.(stepIndex + 1);
          return;
        }

        if (!event.currentTarget.checkValidity()) {
          event.currentTarget.reportValidity();
          return;
        }

        startTransition(async () => {
          const formData = new FormData(event.currentTarget);
          if (identityConsent) {
            formData.set("identityConsent", "true");
          }
          const result = await saveClientOnboardingAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <FieldGroup className="gap-10">
        <FieldSet className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <FieldLegend className="mb-1.5">
              {clientOnboarding.credentialsSectionTitle}
            </FieldLegend>
            <FieldDescription>
              {clientOnboarding.credentialsSectionDescription}
            </FieldDescription>
          </div>

          <div className="v-stack gap-4 md:col-span-2">
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">
                {clientOnboarding.emailLabel}
              </p>
              <p className="text-muted-foreground">{email}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {clientOnboarding.passwordSetNotice}
            </p>
          </div>
        </FieldSet>

        <FieldSeparator />

        <FieldSet
          data-step="0"
          className={cn(
            "grid grid-cols-1 gap-6 md:grid-cols-3",
            stepIndex !== 0 && "hidden",
          )}
        >
          <div>
            <FieldLegend className="mb-1.5">
              {clientOnboarding.identitySectionTitle}
            </FieldLegend>
            <FieldDescription>
              {clientOnboarding.identitySectionDescription}
            </FieldDescription>
          </div>

          <div className="v-stack gap-4 md:col-span-2">
            <PortalFormField
              label={clientOnboarding.fullLegalNameLabel}
              description={clientOnboarding.fullLegalNameDescription}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  name="fullLegalName"
                  autoComplete="name"
                  required
                  className={inputClassName}
                  defaultValue={defaults?.fullLegalName ?? ""}
                  placeholder={clientOnboarding.fullLegalNamePlaceholder}
                />
              )}
            </PortalFormField>

            <PortalFormField
              label={clientOnboarding.nationalityLabel}
              description={clientOnboarding.nationalityDescription}
              required
            >
              {(field) => (
                <CountrySelect
                  id={field.id}
                  name="nationality"
                  defaultValue={defaults?.nationality ?? undefined}
                  required
                  placeholder={clientOnboarding.countrySelectPlaceholder}
                  describedBy={field["aria-describedby"]}
                />
              )}
            </PortalFormField>

            <PortalFormField
              label={clientOnboarding.countryOfResidenceLabel}
              description={clientOnboarding.countryOfResidenceDescription}
              required
            >
              {(field) => (
                <CountrySelect
                  id={field.id}
                  name="countryOfResidence"
                  defaultValue={defaults?.countryOfResidence ?? undefined}
                  required
                  placeholder={clientOnboarding.countrySelectPlaceholder}
                  describedBy={field["aria-describedby"]}
                />
              )}
            </PortalFormField>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {clientOnboarding.additionalResidenceLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {clientOnboarding.additionalResidenceDescription}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ISO_COUNTRY_CODES.map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="additionalResidenceCountries"
                      value={code}
                      defaultChecked={selectedAdditional.has(code)}
                      className="size-4 rounded border-input"
                    />
                    {ISO_COUNTRY_LABELS[code as IsoCountryCode]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FieldSet>

        <FieldSeparator className={stepIndex === 0 ? undefined : "hidden"} />

        <FieldSet
          data-step="1"
          className={cn(
            "grid grid-cols-1 gap-6 md:grid-cols-3",
            stepIndex !== 1 && "hidden",
          )}
        >
          <div>
            <FieldLegend className="mb-1.5">
              {clientOnboarding.passportSectionTitle}
            </FieldLegend>
            <FieldDescription>
              {clientOnboarding.passportSectionDescription}
            </FieldDescription>
          </div>

          <div className="v-stack gap-4 md:col-span-2">
            <PortalFormField
              label={clientOnboarding.passportCountryLabel}
              description={clientOnboarding.passportCountryDescription}
              required
            >
              {(field) => (
                <CountrySelect
                  id={field.id}
                  name="passportIssuingCountry"
                  defaultValue={defaults?.passportIssuingCountry ?? undefined}
                  required
                  placeholder={clientOnboarding.countrySelectPlaceholder}
                  describedBy={field["aria-describedby"]}
                />
              )}
            </PortalFormField>

            <PortalFormField
              label={clientOnboarding.passportNumberLabel}
              description={clientOnboarding.passportNumberDescription}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  name="passportNumber"
                  autoComplete="off"
                  required
                  spellCheck={false}
                  className={inputClassName}
                  defaultValue={defaults?.passportNumber ?? ""}
                  placeholder={clientOnboarding.passportNumberPlaceholder}
                />
              )}
            </PortalFormField>
          </div>
        </FieldSet>

        <FieldSeparator className={stepIndex === 1 ? undefined : "hidden"} />

        <FieldSet
          data-step="2"
          className={cn(
            "grid grid-cols-1 gap-6 md:grid-cols-3",
            stepIndex !== 2 && "hidden",
          )}
        >
          <div>
            <FieldLegend className="mb-1.5">
              {clientOnboarding.entitySectionTitle}
            </FieldLegend>
            <FieldDescription>
              {clientOnboarding.entitySectionDescription}
            </FieldDescription>
          </div>

          <div className="v-stack gap-4 md:col-span-2">
            <PortalFormField
              label={clientOnboarding.entityLabel}
              description={clientOnboarding.entityDescription}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  name="entityName"
                  autoComplete="organization"
                  required
                  spellCheck={false}
                  className={inputClassName}
                  defaultValue={defaults?.entityName ?? ""}
                  placeholder={clientOnboarding.entityPlaceholder}
                />
              )}
            </PortalFormField>

            <PortalFormField
              label={clientOnboarding.jurisdictionLabel}
              description={clientOnboarding.jurisdictionDescription}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  name="jurisdiction"
                  autoComplete="off"
                  required
                  className={inputClassName}
                  defaultValue={defaults?.jurisdiction ?? ""}
                  placeholder={clientOnboarding.jurisdictionPlaceholder}
                />
              )}
            </PortalFormField>
          </div>
        </FieldSet>

        <FieldSeparator className={stepIndex === 2 ? undefined : "hidden"} />

        <FieldSet
          data-step="3"
          className={cn(
            "grid grid-cols-1 gap-6 md:grid-cols-3",
            stepIndex !== 3 && "hidden",
          )}
        >
          <div>
            <FieldLegend className="mb-1.5">
              {clientOnboarding.contactSectionTitle}
            </FieldLegend>
            <FieldDescription>
              {clientOnboarding.contactSectionDescription}
            </FieldDescription>
          </div>

          <div className="v-stack gap-4 md:col-span-2">
            <PortalFormField
              label={clientOnboarding.phoneLabel}
              description={clientOnboarding.phoneDescription}
              required
            >
              {(field) => (
                <Input
                  {...field}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  className={inputClassName}
                  defaultValue={defaults?.phone ?? ""}
                  placeholder={clientOnboarding.phonePlaceholder}
                />
              )}
            </PortalFormField>

          <PortalFormField
            label={clientOnboarding.notesLabel}
            description={clientOnboarding.notesDescription}
          >
            {(field) => (
              <Textarea
                {...field}
                name="notes"
                className="min-h-28 touch-manipulation"
                autoComplete="off"
                defaultValue={defaults?.notes ?? ""}
                placeholder={clientOnboarding.notesPlaceholder}
              />
            )}
          </PortalFormField>
          </div>
        </FieldSet>
      </FieldGroup>

      {isLastStep ? (
        <Label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm font-normal">
          <Checkbox
            checked={identityConsent}
            onCheckedChange={(checked) => setIdentityConsent(checked === true)}
            required
            className="mt-0.5"
          />
          <span>{clientOnboarding.identityConsentLabel}</span>
        </Label>
      ) : null}

      <FormErrorAlert error={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {!isFirstStep ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 touch-manipulation"
            onClick={() => onStepChange?.(stepIndex - 1)}
          >
            {clientOnboarding.formPreviousStep}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          className="min-h-11 touch-manipulation sm:min-w-40"
          disabled={isPending || (isLastStep && !identityConsent)}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2Icon aria-hidden="true" className="animate-spin" />
              {clientOnboarding.submitting}
            </>
          ) : isLastStep ? (
            clientOnboarding.submit
          ) : (
            clientOnboarding.formNextStep
          )}
        </Button>
      </div>
    </form>
  );
}
