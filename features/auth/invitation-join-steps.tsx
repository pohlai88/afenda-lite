"use client";

import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { cn } from "@/modules/platform/utils";

type StepStatus = "done" | "current" | "default";

function resolveStepStatus(index: number, activeStep: number): StepStatus {
  if (index < activeStep) {
    return "done";
  }
  if (index === activeStep) {
    return "current";
  }
  return "default";
}

/** Compact 3-step indicator for `/join` (mobile / Studio shell). */
export function InvitationJoinSteps({
  activeStep,
  className,
}: {
  activeStep: number;
  className?: string;
}) {
  const { clientInvitationJoin } = portalCopy;
  const steps = clientInvitationJoin.steps;

  return (
    <ol
      aria-label="Registration steps"
      className={cn(
        "grid grid-cols-3 gap-2 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {steps.map((step, index) => {
        const status = resolveStepStatus(index, activeStep);

        return (
          <li
            key={step.label}
            className={cn(
              "rounded-lg border px-2 py-2 transition-colors",
              status === "current" &&
                "border-primary/40 bg-primary/5 text-foreground",
              status === "done" &&
                "border-border/60 bg-muted/20 text-foreground",
              status === "default" && "border-border/60 bg-muted/10",
            )}
            aria-current={status === "current" ? "step" : undefined}
          >
            <span className="font-medium">
              {index + 1}. {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
