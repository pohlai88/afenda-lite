"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardCheckIcon,
  FileUpIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  RocketIcon,
} from "lucide-react";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { DeclarationQuestionField } from "@/components/declaration-question-field";
import { FormErrorAlert } from "@/components/form-error-alert";
import { QuestionSequenceBadge } from "@/components/question-sequence-badge";
import {
  buildDeclarationWizardSteps,
  validateStepAnswers,
  type DeclarationWizardStep,
} from "@/lib/declaration-steps";
import { portalCopy } from "@/lib/portal-copy";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/questions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SubmitResult = {
  success?: boolean;
  error?: string;
  confirmationCode?: string;
};

function stepIcon(step: DeclarationWizardStep) {
  if (step.kind === "review") {
    return RocketIcon;
  }
  switch (step.questionType) {
    case "yes_no":
      return ClipboardCheckIcon;
    case "text":
      return MessageSquareTextIcon;
    case "file":
      return FileUpIcon;
    default:
      return ClipboardCheckIcon;
  }
}

function formatReviewAnswer(
  question: SurveyQuestion,
  value: boolean | string | undefined,
  evidenceName: string | undefined,
): string {
  const { declarationForm } = portalCopy;

  if (value === undefined || value === "") {
    return declarationForm.wizard.unanswered;
  }

  if (question.type === "yes_no") {
    return value === true ? declarationForm.yesLabel : declarationForm.noLabel;
  }

  if (question.type === "file") {
    return evidenceName ?? String(value);
  }

  return String(value);
}

export function DeclarationForm({
  surveyId,
  slug,
  title,
  description,
  questions,
  anonymous = false,
  assignmentId,
  hideCardTitle = false,
  onSubmit,
}: {
  surveyId: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  anonymous?: boolean;
  assignmentId?: string;
  hideCardTitle?: boolean;
  onSubmit: (input: {
    slug: string;
    assignmentId?: string;
    answers: SurveyAnswers;
  }) => Promise<SubmitResult>;
}) {
  const { declarationForm, declarationPage, clientDashboard } = portalCopy;
  const wizardCopy = declarationForm.wizard;

  const steps = useMemo(
    () => buildDeclarationWizardSteps(questions, wizardCopy),
    [questions, wizardCopy],
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const isReviewStep = currentStep?.kind === "review";
  const isLastStep = currentStepIndex === steps.length - 1;

  if (confirmationCode) {
    return (
      <ConfirmationReceipt
        code={confirmationCode}
        title={
          assignmentId
            ? clientDashboard.receiptTitle
            : declarationForm.thankYouTitle
        }
        description={
          assignmentId
            ? clientDashboard.receiptDescription
            : declarationForm.thankYouDescription
        }
      />
    );
  }

  if (submitted) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>{declarationForm.thankYouTitle}</CardTitle>
          <div className="portal-prose mx-auto">
            <p>{declarationForm.thankYouDescription}</p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  function validateAllAnswers(): Record<string, string> {
    const nextErrors: Record<string, string> = {};
    for (const question of questions) {
      if (!question.required) continue;
      const value = answers[question.id];
      if (value === undefined || value === "") {
        nextErrors[question.id] = declarationForm.requiredFieldError;
      }
    }
    return nextErrors;
  }

  function focusFirstError(errors: Record<string, string>) {
    const firstId = Object.keys(errors)[0];
    if (!firstId) return;
    contentRef.current
      ?.querySelector<HTMLElement>(`[data-question-id="${firstId}"]`)
      ?.focus();
  }

  function goToStep(index: number) {
    setCurrentStepIndex(index);
    setReviewError(null);
    contentRef.current?.focus();
  }

  function handleNext() {
    if (!currentStep) return;
    setError(null);
    setReviewError(null);

    if (isReviewStep) {
      if (!reviewConfirmed) {
        setReviewError(wizardCopy.reviewAttestationRequired);
        return;
      }
      const allErrors = validateAllAnswers();
      if (Object.keys(allErrors).length > 0) {
        setFieldErrors(allErrors);
        const firstQuestionStep = steps.findIndex((step) => step.kind === "questions");
        if (firstQuestionStep >= 0) {
          goToStep(firstQuestionStep);
        }
        focusFirstError(allErrors);
        return;
      }
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
      return;
    }

    const stepErrors = validateStepAnswers(
      currentStep,
      answers,
      declarationForm.requiredFieldError,
    );
    setFieldErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(stepErrors);
      return;
    }

    goToStep(Math.min(currentStepIndex + 1, steps.length - 1));
  }

  function handlePrevious() {
    goToStep(Math.max(currentStepIndex - 1, 0));
  }

  return (
    <Card className="min-w-0 gap-0 p-0 md:grid md:max-lg:grid-cols-5 lg:grid-cols-4">
      {!hideCardTitle || description || anonymous ? (
        <CardHeader className="border-b md:col-span-full">
          {!hideCardTitle ? (
            <CardTitle className="text-lg text-pretty">{title}</CardTitle>
          ) : null}
          {description ? (
            <div className="portal-prose">
              <p>{description}</p>
            </div>
          ) : null}
          {anonymous ? (
            <div className="portal-prose">
              <p>{declarationPage.secureFormNote}</p>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {wizardCopy.stepProgress(currentStepIndex + 1, steps.length)}
          </p>
        </CardHeader>
      ) : null}

      <CardContent className="col-span-5 min-w-0 overflow-hidden border-b p-4 md:max-lg:col-span-2 md:border-r md:p-6 lg:col-span-1 lg:border-b-0">
        <nav aria-label={wizardCopy.stepProgress(currentStepIndex + 1, steps.length)}>
          <ol className="flex flex-col gap-4">
            {steps.map((step, index) => {
              const Icon = stepIcon(step);
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;

              return (
                <li key={step.id} className="min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full min-w-0 cursor-pointer items-start justify-start gap-3 overflow-hidden whitespace-normal rounded px-2 py-2 text-left"
                    onClick={() => {
                      if (index <= currentStepIndex) {
                        goToStep(index);
                      }
                    }}
                    disabled={index > currentStepIndex}
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback
                        className={cn(
                          isActive || isComplete
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-pretty">{step.title}</p>
                      <p className="text-xs text-muted-foreground text-pretty break-words">
                        {step.description}
                      </p>
                    </div>
                  </Button>
                </li>
              );
            })}
          </ol>
        </nav>
      </CardContent>

      <CardContent
        ref={contentRef}
        tabIndex={-1}
        className="col-span-5 flex min-w-0 flex-col gap-6 p-6 md:col-span-3 lg:col-span-3"
      >
        {currentStep?.kind === "questions" ? (
          <div className="space-y-6">
            <div>
              <h2 className="portal-section-title">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>
            {currentStep.questions.map((question, index) => (
              <DeclarationQuestionField
                key={question.id}
                sequenceNumber={index + 1}
                question={question}
                surveyId={surveyId}
                slug={slug}
                value={answers[question.id]}
                evidenceName={evidenceNames[question.id]}
                error={fieldErrors[question.id]}
                onChange={(value) => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: value,
                  }));
                  setFieldErrors((current) => {
                    if (!current[question.id]) return current;
                    const next = { ...current };
                    delete next[question.id];
                    return next;
                  });
                }}
                onEvidenceRegistered={(evidenceId, fileName) => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: evidenceId,
                  }));
                  setEvidenceNames((current) => ({
                    ...current,
                    [question.id]: fileName,
                  }));
                  setFieldErrors((current) => {
                    if (!current[question.id]) return current;
                    const next = { ...current };
                    delete next[question.id];
                    return next;
                  });
                }}
              />
            ))}
          </div>
        ) : null}

        {isReviewStep ? (
          <div className="space-y-6">
            <div>
              <h2 className="portal-section-title">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium">{wizardCopy.reviewSummaryTitle}</p>
              <dl className="space-y-3 text-sm">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <dt className="flex items-start gap-2 font-medium text-foreground">
                      <QuestionSequenceBadge number={index + 1} className="mt-0.5" />
                      <span>{question.prompt}</span>
                    </dt>
                    <dd className="mt-1 pl-9 whitespace-pre-wrap text-muted-foreground">
                      {formatReviewAnswer(
                        question,
                        answers[question.id],
                        evidenceNames[question.id],
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <Switch
                id="declaration-review-confirm"
                checked={reviewConfirmed}
                onCheckedChange={(checked) => {
                  setReviewConfirmed(checked === true);
                  if (checked) setReviewError(null);
                }}
              />
              <Label
                htmlFor="declaration-review-confirm"
                className="text-sm font-normal leading-relaxed"
              >
                {wizardCopy.reviewAttestationSwitch}
              </Label>
            </div>
            {reviewError ? <FormErrorAlert error={reviewError} /> : null}
          </div>
        ) : null}

        <FormErrorAlert error={error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 touch-manipulation"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || isPending}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {wizardCopy.previous}
          </Button>
          <Button
            type="button"
            className="min-h-11 touch-manipulation"
            onClick={handleNext}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Loader2Icon aria-hidden="true" className="animate-spin" />
                {declarationForm.submitting}
              </>
            ) : isLastStep ? (
              declarationForm.submit
            ) : (
              <>
                {wizardCopy.next}
                <ArrowRightIcon aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
