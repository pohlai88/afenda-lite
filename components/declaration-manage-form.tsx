"use client";

import { updateSurveyAction } from "@/app/actions/surveys";
import { QuestionFieldsEditor } from "@/components/question-fields-editor";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionType } from "@/lib/questions";

export function DeclarationManageForm({
  surveyId,
  title,
  description,
  questions,
}: {
  surveyId: string;
  title: string;
  description: string;
  questions: Array<{ prompt: string; type: QuestionType; required: boolean }>;
}) {
  const { manage } = portalCopy.declarationDetail;

  return (
    <form action={updateSurveyAction} className="space-y-4">
      <input type="hidden" name="id" value={surveyId} />
      <div className="space-y-2">
        <Label htmlFor="edit-title">{manage.titleLabel}</Label>
        <Input id="edit-title" name="title" required defaultValue={title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">{manage.introLabel}</Label>
        <Textarea
          id="edit-description"
          name="description"
          className="min-h-20"
          defaultValue={description}
        />
      </div>
      <QuestionFieldsEditor initialRows={questions} />
      <Button type="submit">{manage.save}</Button>
    </form>
  );
}
