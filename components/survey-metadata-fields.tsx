"use client";

import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { portalCopy } from "@/lib/portal-copy";
import { formatCategoriesInput } from "@/lib/survey-package";
import type { SurveyMetadata } from "@/lib/surveys";

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
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
          <p className="text-xs text-muted-foreground">{copy.declarationIdHint}</p>
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
        <Input
          id="referenceNumber"
          name="referenceNumber"
          defaultValue={metadata?.referenceNumber ?? ""}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="caseNumber">{copy.caseNumber}</Label>
        <Input
          id="caseNumber"
          name="caseNumber"
          defaultValue={metadata?.caseNumber ?? ""}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveDate">{copy.effectiveDate}</Label>
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
          <Input
            id="surveyorName"
            name="surveyorName"
            defaultValue={metadata?.surveyorName ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surveyorOrg">{copy.surveyorOrg}</Label>
          <Input
            id="surveyorOrg"
            name="surveyorOrg"
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
          <Input
            id="surveyeeIndividual"
            name="surveyeeIndividual"
            defaultValue={metadata?.surveyeeIndividual ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surveyeeOrg">{copy.surveyeeOrg}</Label>
          <Input
            id="surveyeeOrg"
            name="surveyeeOrg"
            defaultValue={metadata?.surveyeeOrg ?? ""}
            autoComplete="off"
          />
        </div>
      </fieldset>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="purpose">{copy.purpose}</Label>
        <Textarea
          id="purpose"
          name="purpose"
          className="min-h-16"
          defaultValue={metadata?.purpose ?? ""}
          placeholder={copy.purposePlaceholder}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="categories">{copy.categories}</Label>
        <p className="text-xs text-muted-foreground">{copy.categoriesHint}</p>
        <Input
          id="categories"
          name="categories"
          defaultValue={formatCategoriesInput(metadata?.categories ?? [])}
          placeholder={copy.categoriesPlaceholder}
          autoComplete="off"
        />
      </div>
    </FieldGroup>
  );
}
