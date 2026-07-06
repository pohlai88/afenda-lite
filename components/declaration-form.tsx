"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, UploadIcon } from "lucide-react";
import { registerEvidenceAction } from "@/app/actions/declarations";
import { portalCopy } from "@/lib/portal-copy";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/questions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SubmitResult = {
  success?: boolean;
  error?: string;
  confirmationCode?: string;
};

export function DeclarationForm({
  surveyId,
  slug,
  title,
  description,
  questions,
  anonymous = false,
  assignmentId,
  onSubmit,
}: {
  surveyId: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  anonymous?: boolean;
  assignmentId?: string;
  onSubmit: (input: {
    slug: string;
    assignmentId?: string;
    answers: SurveyAnswers;
  }) => Promise<SubmitResult>;
}) {
  const { declarationForm, declarationPage, clientDashboard } = portalCopy;
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirmationCode) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>
            {assignmentId
              ? clientDashboard.receiptTitle
              : declarationForm.thankYouTitle}
          </CardTitle>
          <CardDescription>
            {assignmentId
              ? clientDashboard.receiptDescription
              : declarationForm.thankYouDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-lg font-semibold tracking-wide">
            {confirmationCode}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>{declarationForm.thankYouTitle}</CardTitle>
          <CardDescription>{declarationForm.thankYouDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-pretty">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-pretty">{description}</CardDescription>
        ) : null}
        {anonymous ? (
          <CardDescription>{declarationPage.secureFormNote}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await onSubmit({ slug, assignmentId, answers });
              if (result?.error) {
                setError(result.error);
                if (result.confirmationCode) {
                  setConfirmationCode(result.confirmationCode);
                }
                return;
              }
              if (result?.confirmationCode) {
                setConfirmationCode(result.confirmationCode);
                return;
              }
              if (result?.success) {
                setSubmitted(true);
              }
            });
          }}
        >
          {questions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              surveyId={surveyId}
              value={answers[question.id]}
              evidenceName={evidenceNames[question.id]}
              onChange={(value) =>
                setAnswers((current) => ({ ...current, [question.id]: value }))
              }
              onEvidenceRegistered={(evidenceId, fileName) => {
                setAnswers((current) => ({
                  ...current,
                  [question.id]: evidenceId,
                }));
                setEvidenceNames((current) => ({
                  ...current,
                  [question.id]: fileName,
                }));
              }}
            />
          ))}

          {error ? (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full touch-manipulation" disabled={isPending}>
            {isPending ? declarationForm.submitting : declarationForm.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionField({
  question,
  surveyId,
  value,
  evidenceName,
  onChange,
  onEvidenceRegistered,
}: {
  question: SurveyQuestion;
  surveyId: string;
  value: boolean | string | undefined;
  evidenceName?: string;
  onChange: (value: boolean | string) => void;
  onEvidenceRegistered: (evidenceId: string, fileName: string) => void;
}) {
  const { declarationForm } = portalCopy;
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRegistering, startRegister] = useTransition();

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {question.prompt}
        {question.required ? (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>

      {question.type === "yes_no" ? (
        <div className="flex gap-2">
          {[true, false].map((option) => (
            <button
              key={String(option)}
              type="button"
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                value === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
              onClick={() => onChange(option)}
              aria-pressed={value === option}
            >
              {option ? declarationForm.yesLabel : declarationForm.noLabel}
            </button>
          ))}
        </div>
      ) : null}

      {question.type === "text" ? (
        <Textarea
          className="min-h-24"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={declarationForm.textPlaceholder}
        />
      ) : null}

      {question.type === "file" ? (
        <div className="space-y-2">
          {typeof value === "string" && value ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <CheckCircleIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate">{evidenceName ?? value}</span>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input
                type="file"
                className="sr-only"
                disabled={isRegistering}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setFileError(null);
                  startRegister(async () => {
                    const formData = new FormData();
                    formData.set("surveyId", surveyId);
                    formData.set("questionId", question.id);
                    formData.set("fileName", file.name);
                    formData.set("mimeType", file.type || "application/octet-stream");
                    formData.set("sizeBytes", String(file.size));
                    const result = await registerEvidenceAction(formData);
                    if (result?.error) {
                      setFileError(result.error);
                      return;
                    }
                    if (result?.evidenceId) {
                      onEvidenceRegistered(result.evidenceId, file.name);
                    }
                  });
                }}
              />
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                <UploadIcon className="size-5" />
                <span>{declarationForm.fileHint}</span>
              </div>
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {declarationForm.fileNote}
          </p>
          {fileError ? (
            <Alert variant="destructive">
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
