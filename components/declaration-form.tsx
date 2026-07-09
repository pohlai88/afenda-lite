"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  buildQuestionOrderIndex,
  clampDraftStepIndex,
  countAnsweredQuestions,
  REVIEW_SUMMARY_QUESTION_LIMIT,
  validateStepAnswers,
  WIZARD_SIDEBAR_STEP_LIMIT,
  type DeclarationWizardStep,
} from "@/lib/domain/declaration-steps";
import { CLIENT_DECLARATION_DRAFT_API_HREF } from "@/lib/api/routes";
import { portalCopy } from "@/lib/copy/portal-copy";
import { formatDateTime } from "@/lib/format";
import type { SurveyAnswers, SurveyQuestion } from "@/lib/question-models";
import { validateQuestionAnswer } from "@/lib/question-answer-validation";
import {
  StudioFormLayoutWizardShell,
  StudioFormLayoutWizardStep,
} from "@/components/shadcn-studio/blocks/form-layout-08/form-layout-wizard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SubmitResult = {
  success?: boolean;
  error?: string;
  confirmationCode?: string;
  savedAt?: string;
};

const DRAFT_AUTOSAVE_MS = 1200;

function draftSnapshot(answers: SurveyAnswers, stepIndex: number) {
  return JSON.stringify({ answers, stepIndex });
}

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
  initialAnswers,
  initialStepIndex = 0,
  initialEvidenceNames,
  initialDraftSavedAt,
  onSaveDraft,
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
  initialAnswers?: SurveyAnswers;
  initialStepIndex?: number;
  initialEvidenceNames?: Record<string, string>;
  initialDraftSavedAt?: Date;
  onSaveDraft?: (input: {
    assignmentId: string;
    answers: SurveyAnswers;
    stepIndex: number;
  }) => Promise<SubmitResult>;
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
  const questionOrderIndex = useMemo(
    () => buildQuestionOrderIndex(questions),
    [questions],
  );
  const questionValidationCopy = useMemo(
    () => ({
      requiredFieldError: declarationForm.requiredFieldError,
      fileRequired: declarationForm.fileRequired,
      yesNoRequired: declarationForm.yesNoRequired,
      textTooShort: declarationForm.textTooShort,
      textTooLong: declarationForm.textTooLong,
    }),
    [declarationForm],
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    clampDraftStepIndex(initialStepIndex, steps.length),
  );
  const [furthestStepIndex, setFurthestStepIndex] = useState(() =>
    clampDraftStepIndex(initialStepIndex, steps.length),
  );
  const [answers, setAnswers] = useState<SurveyAnswers>(() => initialAnswers ?? {});
  const [evidenceNames, setEvidenceNames] = useState<Record<string, string>>(
    () => initialEvidenceNames ?? {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(
    () => initialDraftSavedAt ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const initialStep = clampDraftStepIndex(initialStepIndex, steps.length);
  const draftSnapshotRef = useRef({
    answers: initialAnswers ?? {},
    stepIndex: initialStep,
  });
  const lastPersistedRef = useRef(
    draftSnapshot(initialAnswers ?? {}, initialStep),
  );

  draftSnapshotRef.current = { answers, stepIndex: currentStepIndex };

  const currentSnapshot = draftSnapshot(answers, currentStepIndex);
  const isDraftDirty =
    Boolean(assignmentId && onSaveDraft) &&
    currentSnapshot !== lastPersistedRef.current;

  const currentStep = steps[currentStepIndex];
  const isReviewStep = currentStep?.kind === "review";
  const isLastStep = currentStepIndex === steps.length - 1;
  const answeredCount = useMemo(
    () => countAnsweredQuestions(questions, answers),
    [questions, answers],
  );
  const showReviewSummary = questions.length <= REVIEW_SUMMARY_QUESTION_LIMIT;
  const compactSidebar = steps.length > WIZARD_SIDEBAR_STEP_LIMIT;
  const isSavingDraft = isPending && !isReviewStep;

  useEffect(() => {
    if (!assignmentId || !onSaveDraft || isReviewStep) {
      return;
    }

    if (currentSnapshot === lastPersistedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        await persistDraft(currentStepIndex);
      });
    }, DRAFT_AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [
    assignmentId,
    onSaveDraft,
    isReviewStep,
    currentSnapshot,
    currentStepIndex,
  ]);

  useEffect(() => {
    if (!assignmentId) {
      return;
    }

    function flushDraftKeepalive() {
      const { answers: latestAnswers, stepIndex } = draftSnapshotRef.current;
      const snapshot = draftSnapshot(latestAnswers, stepIndex);
      if (snapshot === lastPersistedRef.current) {
        return;
      }

      void fetch(CLIENT_DECLARATION_DRAFT_API_HREF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          answers: latestAnswers,
          stepIndex,
        }),
        keepalive: true,
      })
        .then((response) => response.json())
        .then((payload: { savedAt?: string }) => {
          if (payload.savedAt) {
            lastPersistedRef.current = snapshot;
          }
        })
        .catch(() => undefined);
    }

    function handleBeforeUnload() {
      flushDraftKeepalive();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushDraftKeepalive();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushDraftKeepalive();
    };
  }, [assignmentId]);

  async function persistDraft(stepIndex: number) {
    if (!assignmentId || !onSaveDraft) {
      return true;
    }

    const { answers: latestAnswers } = draftSnapshotRef.current;

    const saveResult = await onSaveDraft({
      assignmentId,
      answers: latestAnswers,
      stepIndex,
    });
    if (saveResult?.error) {
      setError(saveResult.error);
      return false;
    }
    if (saveResult?.savedAt) {
      setDraftSavedAt(new Date(saveResult.savedAt));
      lastPersistedRef.current = draftSnapshot(latestAnswers, stepIndex);
    }
    return true;
  }

  function handleSaveProgress() {
    setError(null);
    startTransition(async () => {
      await persistDraft(currentStepIndex);
    });
  }

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
      const message = validateQuestionAnswer(
        question,
        answers[question.id],
        questionValidationCopy,
      );
      if (message) {
        nextErrors[question.id] = message;
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
    if (
      index !== currentStepIndex &&
      assignmentId &&
      onSaveDraft &&
      currentSnapshot !== lastPersistedRef.current
    ) {
      startTransition(async () => {
        const saved = await persistDraft(currentStepIndex);
        if (saved) {
          setCurrentStepIndex(index);
          setReviewError(null);
          contentRef.current?.focus();
        }
      });
      return;
    }

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
      questionValidationCopy,
    );
    setFieldErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(stepErrors);
      return;
    }

    startTransition(async () => {
      const saved = await persistDraft(currentStepIndex + 1);
      if (!saved) {
        return;
      }

      const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);
      setFurthestStepIndex((current) => Math.max(current, nextIndex));
      goToStep(nextIndex);
    });
  }

  function handlePrevious() {
    if (currentStepIndex === 0) {
      return;
    }

    setError(null);
    const previousIndex = currentStepIndex - 1;
    startTransition(async () => {
      const saved = await persistDraft(previousIndex);
      if (!saved) {
        return;
      }
      goToStep(previousIndex);
    });
  }

  return (
    <StudioFormLayoutWizardShell
      header={
        !hideCardTitle || description || anonymous || assignmentId ? (
          <>
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
            {questions.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {wizardCopy.questionsAnswered(answeredCount, questions.length)}
              </p>
            ) : null}
            {assignmentId ? (
              <p
                className="text-xs text-muted-foreground"
                aria-live="polite"
              >
                {isSavingDraft
                  ? wizardCopy.draftSaving
                  : isDraftDirty
                    ? wizardCopy.draftAutosavePending
                    : draftSavedAt
                      ? wizardCopy.draftSavedAt(formatDateTime(draftSavedAt))
                      : wizardCopy.draftAutosavePending}
              </p>
            ) : null}
          </>
        ) : undefined
      }
      sidebar={
        compactSidebar ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{currentStep?.title}</p>
            <p className="text-muted-foreground">
              {wizardCopy.stepProgress(currentStepIndex + 1, steps.length)}
            </p>
            <p className="text-muted-foreground">
              {wizardCopy.questionsAnswered(answeredCount, questions.length)}
            </p>
          </div>
        ) : (
          <nav aria-label={wizardCopy.stepProgress(currentStepIndex + 1, steps.length)}>
            <ol className="flex flex-col gap-4">
              {steps.map((step, index) => {
                const Icon = stepIcon(step);
                const reachable = index <= furthestStepIndex;
                return (
                  <StudioFormLayoutWizardStep
                    key={step.id}
                    title={step.title}
                    description={step.description}
                    icon={<Icon aria-hidden="true" className="size-4" />}
                    active={index === currentStepIndex}
                    complete={index < currentStepIndex}
                    disabled={!reachable}
                    onSelect={() => {
                      if (reachable) {
                        goToStep(index);
                      }
                    }}
                  />
                );
              })}
            </ol>
          </nav>
        )
      }
      contentRef={contentRef}
    >
        {currentStep?.kind === "questions" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:sticky md:top-6 md:self-start">
              <h2 className="portal-section-title">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {currentStep.description}
              </p>
            </div>
            <div className="space-y-6 md:col-span-2">
            {currentStep.questions.map((question) => (
              <DeclarationQuestionField
                key={question.id}
                sequenceNumber={questionOrderIndex.get(question.id) ?? 0}
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
          </div>
        ) : null}

        {isReviewStep ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:sticky md:top-6 md:self-start">
              <h2 className="portal-section-title">{currentStep.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {currentStep.description}
              </p>
            </div>
            <div className="space-y-6 md:col-span-2">

            <div className="space-y-4">
              <p className="text-sm font-medium">{wizardCopy.reviewSummaryTitle}</p>
              {showReviewSummary ? (
                <dl className="space-y-3 text-sm">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-lg border bg-muted/30 px-4 py-3"
                    >
                      <dt className="flex items-start gap-2 font-medium text-foreground">
                        <QuestionSequenceBadge
                          number={questionOrderIndex.get(question.id) ?? 0}
                          className="mt-0.5"
                        />
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
              ) : (
                <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {wizardCopy.reviewSummaryCompact(answeredCount, questions.length)}
                </p>
              )}
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {assignmentId && onSaveDraft && !isReviewStep ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 touch-manipulation"
                onClick={handleSaveProgress}
                disabled={isPending}
              >
                {isSavingDraft ? wizardCopy.draftSaving : wizardCopy.saveProgress}
              </Button>
            ) : null}
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
                {isSavingDraft ? wizardCopy.draftSaving : declarationForm.submitting}
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
        </div>
    </StudioFormLayoutWizardShell>
  );
}
