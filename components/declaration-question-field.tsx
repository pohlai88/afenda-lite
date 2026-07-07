"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircleIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { registerEvidenceAction } from "@/app/actions/declarations";
import { FormErrorAlert } from "@/components/form-error-alert";
import { QuestionSequenceBadge } from "@/components/question-sequence-badge";
import { portalCopy } from "@/lib/portal-copy";
import type { SurveyQuestion } from "@/lib/questions";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function DeclarationQuestionField({
  question,
  sequenceNumber,
  surveyId,
  slug,
  value,
  evidenceName,
  error,
  onChange,
  onEvidenceRegistered,
}: {
  question: SurveyQuestion;
  sequenceNumber: number;
  surveyId: string;
  slug: string;
  value: boolean | string | undefined;
  evidenceName?: string;
  error?: string;
  onChange: (value: boolean | string) => void;
  onEvidenceRegistered: (evidenceId: string, fileName: string) => void;
}) {
  const { declarationForm } = portalCopy;
  const { questionNumber } = portalCopy.questions;
  const legendId = useId();
  const [fileError, setFileError] = useState<string | null>(null);
  const [isRegistering, startRegister] = useTransition();
  const fileInputId = `${legendId}-file`;

  const radioValue =
    value === true ? "yes" : value === false ? "no" : undefined;

  return (
    <fieldset
      className="space-y-2 rounded-lg border bg-card p-4"
      data-question-id={question.id}
      aria-invalid={error ? true : undefined}
      aria-label={`${questionNumber(sequenceNumber)}: ${question.prompt}`}
    >
      <legend id={legendId} className="flex items-start gap-2 text-sm font-medium">
        <QuestionSequenceBadge number={sequenceNumber} className="mt-0.5" />
        <span>
          {question.prompt}
          {question.required ? (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      </legend>
      {question.config.helpText ? (
        <p className="text-xs text-muted-foreground">{question.config.helpText}</p>
      ) : null}

      {question.type === "yes_no" ? (
        <RadioGroup
          value={radioValue}
          onValueChange={(next) => onChange(next === "yes")}
          className="v-stack gap-2 sm:h-stack sm:gap-4"
          aria-labelledby={legendId}
        >
          {(
            [
              { key: "yes", label: declarationForm.yesLabel },
              { key: "no", label: declarationForm.noLabel },
            ] as const
          ).map((option) => (
            <Label
              key={option.key}
              htmlFor={`${legendId}-${option.key}`}
              className={cn(
                "flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                radioValue === option.key &&
                  "border-primary bg-primary/5 text-foreground",
              )}
            >
              <RadioGroupItem
                id={`${legendId}-${option.key}`}
                value={option.key}
              />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      ) : null}

      {question.type === "text" ? (
        <Textarea
          id={`${legendId}-text`}
          name={`answer-${question.id}`}
          className="min-h-24"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            question.config.placeholder ?? declarationForm.textPlaceholder
          }
          autoComplete="off"
          aria-labelledby={legendId}
          aria-invalid={error ? true : undefined}
        />
      ) : null}

      {question.type === "file" ? (
        <div className="space-y-2">
          {typeof value === "string" && value ? (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <CheckCircleIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
              <span className="truncate">{evidenceName ?? value}</span>
            </div>
          ) : (
            <>
              <input
                id={fileInputId}
                type="file"
                className="sr-only"
                disabled={isRegistering}
                aria-labelledby={legendId}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setFileError(null);
                  startRegister(async () => {
                    const formData = new FormData();
                    formData.set("surveyId", surveyId);
                    formData.set("slug", slug);
                    formData.set("questionId", question.id);
                    formData.set("fileName", file.name);
                    formData.set(
                      "mimeType",
                      file.type || "application/octet-stream",
                    );
                    formData.set("sizeBytes", String(file.size));
                    const result = await registerEvidenceAction(formData);
                    if (result && "error" in result && result.error) {
                      setFileError(result.error);
                      return;
                    }
                    if (result && "evidenceId" in result && result.evidenceId) {
                      onEvidenceRegistered(result.evidenceId, file.name);
                    }
                  });
                }}
              />
              <Label
                htmlFor={fileInputId}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  isRegistering && "pointer-events-none opacity-60",
                )}
              >
                {isRegistering ? (
                  <>
                    <Loader2Icon
                      aria-hidden="true"
                      className="size-5 animate-spin"
                    />
                    <span>{declarationForm.fileUploading}</span>
                  </>
                ) : (
                  <>
                    <UploadIcon aria-hidden="true" className="size-5" />
                    <span>{declarationForm.fileHint}</span>
                  </>
                )}
              </Label>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {declarationForm.fileNote}
          </p>
          {fileError ? <FormErrorAlert error={fileError} /> : null}
        </div>
      ) : null}

      {error ? <FormErrorAlert error={error} /> : null}
    </fieldset>
  );
}
