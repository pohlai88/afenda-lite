"use client";

import { useState, useTransition } from "react";
import { createSurveyAction } from "@/app/actions/surveys";
import { QuestionFieldsEditor } from "@/components/question-fields-editor";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DeclarationCreateForm() {
  const { create } = portalCopy.account;
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
      <div className="space-y-2">
        <Label htmlFor="survey-title">{create.titleLabel}</Label>
        <Input
          id="survey-title"
          name="title"
          required
          placeholder={create.titlePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="survey-description">{create.introLabel}</Label>
        <Textarea
          id="survey-description"
          name="description"
          className="min-h-20"
          placeholder={create.introPlaceholder}
        />
      </div>
      <QuestionFieldsEditor />
      {error ? (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {create.submit}
      </Button>
    </form>
  );
}
