"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleIcon,
  Loader2Icon,
  MinusCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { importSurveyPackageAction } from "@/app/actions/surveys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormErrorAlert } from "@/components/form-error-alert";
import { Progress } from "@/components/ui/progress";
import { portalCopy } from "@/lib/portal-copy";
import {
  analyzeCdpPackageInput,
  confidenceLabel,
  INGEST_STEPS,
  type DodCheck,
  type PackageAnalysis,
} from "@/lib/survey-package-analyze";
import { cn } from "@/lib/utils";

type Phase = "preview" | "ingesting" | "complete" | "error";

function DodStatusIcon({ status }: { status: DodCheck["status"] }) {
  switch (status) {
    case "pass":
      return (
        <CheckCircle2Icon
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
        />
      );
    case "fail":
      return (
        <XCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-destructive"
        />
      );
    case "warn":
      return (
        <AlertTriangleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
        />
      );
    default:
      return (
        <MinusCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      );
  }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const { package: copy } = portalCopy.declarationDetail;
  const level = confidenceLabel(confidence);
  const levelLabel =
    level === "high"
      ? copy.confidenceHigh
      : level === "medium"
        ? copy.confidenceMedium
        : copy.confidenceLow;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{copy.confidenceLabel}</span>
        <span className="tabular-nums text-muted-foreground">
          {confidence}% · {levelLabel}
        </span>
      </div>
      <Progress value={confidence} aria-label={copy.confidenceLabel} />
      <p className="text-xs text-muted-foreground">{copy.confidenceHint}</p>
    </div>
  );
}

function DodChecklist({ checks }: { checks: DodCheck[] }) {
  const { package: copy } = portalCopy.declarationDetail;
  const required = checks.filter((c) => c.required);
  const recommended = checks.filter((c) => !c.required);

  function renderCheck(check: DodCheck, dashed: boolean) {
    return (
      <li
        key={check.id}
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:gap-3",
          dashed && "border-dashed bg-muted/20",
          check.status === "fail" && "border-destructive/40 bg-destructive/5",
          check.status === "warn" &&
            "border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5",
        )}
      >
        <DodStatusIcon status={check.status} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", !check.required && "font-normal")}>
            {check.label}
          </p>
          {check.detail ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {check.detail}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "w-fit shrink-0 tabular-nums",
            check.status === "pass" &&
              "border-primary/30 text-primary dark:border-primary/40",
            check.status === "warn" &&
              "border-amber-500/40 text-amber-700 dark:text-amber-300",
            check.status === "fail" && "border-destructive/40 text-destructive",
          )}
        >
          {copy.dodStatus[check.status]}
        </Badge>
      </li>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {copy.dodRequired}
        </p>
        <ul className="space-y-2">{required.map((check) => renderCheck(check, false))}</ul>
      </div>
      {recommended.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {copy.dodRecommended}
          </p>
          <ul className="space-y-2">
            {recommended.map((check) => renderCheck(check, true))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function IngestProgress({
  progress,
  activeStepIndex,
}: {
  progress: number;
  activeStepIndex: number;
}) {
  const { package: copy } = portalCopy.declarationDetail;
  const stepLabels: Record<string, string> = {
    validate: copy.stepValidate,
    metadata: copy.stepMetadata,
    declaration: copy.stepDeclaration,
    assignment: copy.stepAssignment,
    finalize: copy.stepFinalize,
  };

  return (
    <div className="space-y-4">
      <Progress value={progress} aria-label={copy.ingestingTitle} />
      <p className="text-center text-sm tabular-nums text-muted-foreground">
        {progress}%
      </p>
      <ol className="space-y-1 rounded-lg border bg-muted/20 p-2" aria-live="polite">
        {INGEST_STEPS.map((step, index) => {
          const done = index < activeStepIndex;
          const active = index === activeStepIndex;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                active && "bg-muted/60",
              )}
            >
              {done ? (
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
              ) : active ? (
                <Loader2Icon
                  aria-hidden="true"
                  className="size-4 animate-spin text-primary"
                />
              ) : (
                <CircleIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              )}
              <span className={cn(active && "font-medium")}>
                {stepLabels[step.id] ?? step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SurveyPackageIngestDialog({
  open,
  onOpenChange,
  surveyId,
  analysis,
  createAssignment,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  analysis: PackageAnalysis | null;
  createAssignment: boolean;
  onComplete?: () => void;
}) {
  const { package: copy } = portalCopy.declarationDetail;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("preview");
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assignmentCreated, setAssignmentCreated] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const reset = useCallback(() => {
    setPhase("preview");
    setProgress(0);
    setActiveStepIndex(0);
    setError(null);
    setAssignmentCreated(false);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      if (pendingRefresh) {
        startTransition(() => {
          router.refresh();
        });
        setPendingRefresh(false);
      }
      reset();
    }
  }, [open, pendingRefresh, reset, router]);

  async function runIngest() {
    if (!analysis?.packageJson || !analysis.canIngest) return;

    setPhase("ingesting");
    setError(null);
    setIsStarting(true);

    let stepIndex = 0;
    const tick = setInterval(() => {
      if (stepIndex < INGEST_STEPS.length - 1) {
        stepIndex += 1;
        setActiveStepIndex(stepIndex);
        setProgress(INGEST_STEPS[stepIndex]?.progress ?? 0);
      }
    }, 400);

    try {
      const result = await importSurveyPackageAction({
        surveyId,
        packageJson: analysis.packageJson,
        createAssignment,
      });

      clearInterval(tick);

      if (result?.error) {
        setError(result.error);
        setPhase("error");
        setProgress(INGEST_STEPS[0]?.progress ?? 0);
        return;
      }

      setProgress(100);
      setActiveStepIndex(INGEST_STEPS.length);
      setAssignmentCreated(Boolean(result?.assignmentCreated));
      setPhase("complete");
      setPendingRefresh(true);
      onComplete?.();
    } catch {
      clearInterval(tick);
      setError(copy.invalidJson);
      setPhase("error");
    } finally {
      setIsStarting(false);
    }
  }

  if (!analysis) return null;

  const blockingChecks = analysis.dodChecks.filter(
    (c) => c.required && c.status === "fail",
  );

  const canDismiss = phase !== "ingesting";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !canDismiss) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton={canDismiss}
      >
        {phase === "preview" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.reviewTitle}</DialogTitle>
              <DialogDescription>{copy.reviewDescription}</DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="space-y-6">
                <section className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{copy.summaryTitle}</p>
                  <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(7rem,auto)_1fr]">
                    {analysis.summary.fileName ? (
                      <>
                        <dt className="text-muted-foreground">{copy.summaryFile}</dt>
                        <dd className="min-w-0 truncate font-medium text-foreground sm:text-right">
                          {analysis.summary.fileName}
                        </dd>
                      </>
                    ) : null}
                    <dt className="text-muted-foreground">{copy.summaryTitleField}</dt>
                    <dd className="min-w-0 truncate font-medium text-foreground sm:text-right">
                      {analysis.summary.title}
                    </dd>
                    <dt className="text-muted-foreground">{copy.summaryQuestionsLabel}</dt>
                    <dd className="font-medium text-foreground sm:text-right">
                      {copy.summaryQuestions(analysis.summary.questionCount)}
                    </dd>
                    <dt className="text-muted-foreground">{copy.summaryAssignmentLabel}</dt>
                    <dd className="font-medium text-foreground sm:text-right">
                      {analysis.summary.hasAssignment
                        ? copy.summaryAssignment
                        : copy.summaryNoAssignment}
                    </dd>
                  </dl>
                </section>

                <section className="rounded-lg border p-4">
                  <ConfidenceBar confidence={analysis.confidence} />
                </section>

                {blockingChecks.length > 0 ? (
                  <section
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                    role="alert"
                  >
                    <p className="text-sm font-semibold text-destructive">
                      {copy.blockingTitle}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-destructive/90">
                      {blockingChecks.map((check) => (
                        <li key={check.id} className="flex gap-2">
                          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
                          <span>{check.detail ?? check.label}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <p className="mb-3 text-sm font-semibold">{copy.dodTitle}</p>
                  <DodChecklist checks={analysis.dodChecks} />
                </section>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {copy.cancelReview}
              </Button>
              <Button
                type="button"
                disabled={!analysis.canIngest || isStarting}
                onClick={() => void runIngest()}
              >
                {isStarting ? copy.startingIngest : copy.startIngest}
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === "ingesting" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.ingestingTitle}</DialogTitle>
              <DialogDescription>{copy.ingestingDescription}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <IngestProgress
                progress={progress}
                activeStepIndex={activeStepIndex}
              />
            </DialogBody>
          </>
        ) : null}

        {phase === "complete" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.completeTitle}</DialogTitle>
              <DialogDescription>{copy.completeDescription}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-primary">
                  <CheckCircle2Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{copy.imported}</span>
                </div>
                <ConfidenceBar confidence={analysis.confidence} />
                <p className="leading-relaxed text-muted-foreground">
                  {assignmentCreated
                    ? copy.assignmentCreated
                    : copy.assignmentSkipped}
                </p>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {copy.closeComplete}
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === "error" ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy.ingestingTitle}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <FormErrorAlert error={error} />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhase("preview")}
              >
                {copy.cancelReview}
              </Button>
              {analysis.canIngest ? (
                <Button type="button" onClick={() => void runIngest()}>
                  {copy.startIngest}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function analyzeUploadedPackage(file: File, packageJson: string) {
  return analyzeCdpPackageInput({
    packageJson,
    fileName: file.name,
  });
}
