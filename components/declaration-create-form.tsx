"use client";

import { useState, useTransition } from "react";
import { createSurveyAction } from "@/app/actions/surveys";
import { FormErrorAlert } from "@/components/form-error-alert";
import { PortalFormField } from "@/components/portal-form-field";
import { QuestionFieldsEditor } from "@/components/question-fields-editor";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function DeclarationCreateForm() {
  const { create } = portalCopy.org;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createSurveyAction(new FormData(event.currentTarget));
          if (result?.error) setError(result.error);
        });
      }}
    >
      <FieldGroup className="gap-4">
        <PortalFormField label={create.titleLabel} required>
          {({ id }) => (
            <Input
              id={id}
              name="title"
              required
              autoComplete="off"
              placeholder={create.titlePlaceholder}
            />
          )}
        </PortalFormField>

        <PortalFormField label={create.introLabel}>
          {({ id }) => (
            <Textarea
              id={id}
              name="description"
              className="min-h-20"
              autoComplete="off"
              placeholder={create.introPlaceholder}
            />
          )}
        </PortalFormField>
      </FieldGroup>

      <QuestionFieldsEditor />

      <FormErrorAlert error={error} />

      <Button
        type="submit"
        className="w-full touch-manipulation"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2Icon aria-hidden="true" className="animate-spin" />
            {create.submitting}
          </>
        ) : (
          create.submit
        )}
      </Button>
    </form>
  );
}
