"use client";

import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SURVEY_EDITOR } from "@/lib/form-constraints";
import { portalCopy } from "@/lib/copy/portal-copy";
import { formatCategoriesInput } from "@/lib/domain/survey-package";
import type { SurveyMetadata } from "@/lib/domain/surveys";

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function FieldHint({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function SurveyMetadataFields({
  declarationId,
  metadata,
}: {
  declarationId?: string;
  metadata?: Partial<SurveyMetadata>;
}) {
  const { metadata: copy } = portalCopy.declarationDetail;

  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      {declarationId ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="declarationId">{copy.declarationId}</Label>
          <FieldHint>{copy.declarationIdHint}</FieldHint>
          <Input
            id="declarationId"
            value={declarationId}
            readOnly
            aria-readonly="true"
            className="font-mono text-xs"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="referenceNumber">{copy.referenceNumber}</Label>
        <FieldHint>{copy.referenceNumberHint}</FieldHint>
        <Input
          id="referenceNumber"
          name="referenceNumber"
          maxLength={SURVEY_EDITOR.referenceMax}
          defaultValue={metadata?.referenceNumber ?? ""}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="caseNumber">{copy.caseNumber}</Label>
        <FieldHint>{copy.caseNumberHint}</FieldHint>
        <Input
          id="caseNumber"
          name="caseNumber"
          maxLength={SURVEY_EDITOR.referenceMax}
          defaultValue={metadata?.caseNumber ?? ""}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveDate">{copy.effectiveDate}</Label>
        <FieldHint>{copy.effectiveDateHint}</FieldHint>
        <Input
          id="effectiveDate"
          name="effectiveDate"
          type="date"
          defaultValue={toDateInputValue(metadata?.effectiveDate ?? null)}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="submitBefore">{copy.submitBefore}</Label>
        <FieldHint>{copy.submitBeforeHint}</FieldHint>
        <Input
          id="submitBefore"
          name="submitBefore"
          type="date"
          defaultValue={toDateInputValue(metadata?.submitBefore ?? null)}
          autoComplete="off"
        />
      </div>

      <fieldset className="space-y-3 rounded-lg border p-3 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        <legend className="px-1 text-xs font-medium text-muted-foreground sm:col-span-2">
          {copy.surveyorTitle}
        </legend>
        <div className="space-y-2">
          <Label htmlFor="surveyorName">{copy.surveyorName}</Label>
          <FieldHint>{copy.surveyorNameHint}</FieldHint>
          <Input
            id="surveyorName"
            name="surveyorName"
            maxLength={SURVEY_EDITOR.partyNameMax}
            defaultValue={metadata?.surveyorName ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surveyorOrg">{copy.surveyorOrg}</Label>
          <FieldHint>{copy.surveyorOrgHint}</FieldHint>
          <Input
            id="surveyorOrg"
            name="surveyorOrg"
            maxLength={SURVEY_EDITOR.partyNameMax}
            defaultValue={metadata?.surveyorOrg ?? ""}
            autoComplete="off"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-3 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        <legend className="px-1 text-xs font-medium text-muted-foreground sm:col-span-2">
          {copy.surveyeeTitle}
        </legend>
        <div className="space-y-2">
          <Label htmlFor="surveyeeIndividual">{copy.surveyeeIndividual}</Label>
          <FieldHint>{copy.surveyeeIndividualHint}</FieldHint>
          <Input
            id="surveyeeIndividual"
            name="surveyeeIndividual"
            maxLength={SURVEY_EDITOR.partyNameMax}
            defaultValue={metadata?.surveyeeIndividual ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surveyeeOrg">{copy.surveyeeOrg}</Label>
          <FieldHint>{copy.surveyeeOrgHint}</FieldHint>
          <Input
            id="surveyeeOrg"
            name="surveyeeOrg"
            maxLength={SURVEY_EDITOR.partyNameMax}
            defaultValue={metadata?.surveyeeOrg ?? ""}
            autoComplete="off"
          />
        </div>
      </fieldset>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="purpose">{copy.purpose}</Label>
        <FieldHint>{copy.purposeHint}</FieldHint>
        <Textarea
          id="purpose"
          name="purpose"
          className="min-h-16"
          maxLength={SURVEY_EDITOR.purposeMax}
          defaultValue={metadata?.purpose ?? ""}
          placeholder={copy.purposePlaceholder}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="categories">{copy.categories}</Label>
        <FieldHint>{copy.categoriesHint}</FieldHint>
        <Input
          id="categories"
          name="categories"
          maxLength={
            SURVEY_EDITOR.categoriesMax * (SURVEY_EDITOR.categoryMax + 2)
          }
          defaultValue={formatCategoriesInput(metadata?.categories ?? [])}
          placeholder={copy.categoriesPlaceholder}
          autoComplete="off"
        />
      </div>
    </FieldGroup>
  );
}
