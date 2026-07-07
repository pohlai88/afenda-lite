"use client";

import { useState, useTransition } from "react";
import { updateSurveyAction } from "@/app/actions/surveys";
import {
  DeclarationSettingsDivider,
  DeclarationSettingsSection,
} from "@/components/declaration-settings-section";
import { QuestionFieldsEditor } from "@/components/question-fields-editor";
import { SurveyMetadataFields } from "@/components/survey-metadata-fields";
import { SurveyPackagePanel } from "@/components/survey-package-panel";
import { FormErrorAlert } from "@/components/form-error-alert";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/lib/questions";
import type { QuestionConfig } from "@/lib/survey-package";
import type { SurveyMetadata } from "@/lib/surveys";

export function DeclarationManageForm({
  surveyId,
  fieldsKey,
  title,
  description,
  questions,
  metadata,
}: {
  surveyId: string;
  fieldsKey: string;
  title: string;
  description: string;
  questions: Array<{
    prompt: string;
    type: QuestionType;
    required: boolean;
    config?: QuestionConfig;
  }>;
  metadata: SurveyMetadata;
}) {
  const { manage } = portalCopy.declarationDetail;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await updateSurveyAction(new FormData(event.currentTarget));
          if (result?.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="id" value={surveyId} />

      <DeclarationSettingsSection
        title={manage.sections.package.title}
        description={manage.sections.package.description}
      >
        <SurveyPackagePanel surveyId={surveyId} />
      </DeclarationSettingsSection>

      <DeclarationSettingsDivider />

      <div key={fieldsKey} className="contents">
        <DeclarationSettingsSection
          title={manage.sections.caseDetails.title}
          description={manage.sections.caseDetails.description}
        >
          <SurveyMetadataFields declarationId={surveyId} metadata={metadata} />
        </DeclarationSettingsSection>

        <DeclarationSettingsDivider />

        <DeclarationSettingsSection
          title={manage.sections.declaration.title}
          description={manage.sections.declaration.description}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-title">{manage.titleLabel}</FieldLabel>
              <Input
                id="edit-title"
                name="title"
                required
                defaultValue={title}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-description">{manage.introLabel}</FieldLabel>
              <Textarea
                id="edit-description"
                name="description"
                className="min-h-20"
                defaultValue={description}
              />
            </Field>
          </FieldGroup>
        </DeclarationSettingsSection>

        <DeclarationSettingsDivider />

        <DeclarationSettingsSection
          title={manage.sections.questions.title}
          description={manage.sections.questions.description}
        >
          <QuestionFieldsEditor
            initialRows={questions.map((q) => ({
              ...q,
              config: q.config ?? {},
            }))}
          />
        </DeclarationSettingsSection>
      </div>

      <DeclarationSettingsDivider />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isPending} className="sm:min-w-40">
          {manage.save}
        </Button>
      </div>

      <FormErrorAlert error={error} />
    </form>
  );
}
