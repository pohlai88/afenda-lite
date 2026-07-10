"use client";

import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "@/components/ui/timeline";
import { InvitationJoinSteps } from "@/features/auth/invitation-join-steps";
import { portalCopy } from "@/lib/copy/portal-copy";
import { cn } from "@/lib/utils";

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

/**
 * Storybook / Guardian-comparison join steps.
 * Compact variant delegates to production `InvitationJoinSteps` (single SSOT).
 */
export function PortalInvitationJoinSteps({
  activeStep,
  variant = "brand",
  className,
}: {
  activeStep: number;
  variant?: "brand" | "compact";
  className?: string;
}) {
  const { clientInvitationJoin } = portalCopy;
  const steps = clientInvitationJoin.steps;

  if (variant === "compact") {
    return (
      <InvitationJoinSteps activeStep={activeStep} className={className} />
    );
  }

  return (
    <Timeline
      aria-label="Registration steps"
      className={cn("mt-8 w-full max-w-md", className)}
      positions="left"
    >
      {steps.map((step, index) => {
        const status = resolveStepStatus(index, activeStep);
        const isLast = index === steps.length - 1;
        const dotStatus =
          status === "done" ? "done" : status === "current" ? "current" : "default";

        return (
          <TimelineItem
            key={step.label}
            status={status === "done" ? "done" : "default"}
            aria-current={status === "current" ? "step" : undefined}
          >
            <TimelineDot status={dotStatus} />
            <TimelineHeading side="right" variant="primary">
              {step.label}
            </TimelineHeading>
            <TimelineContent side="right" className={cn(isLast && "pb-0")}>
              <p className="text-sm text-muted-foreground text-pretty">{step.detail}</p>
            </TimelineContent>
            {!isLast ? <TimelineLine done={status === "done"} /> : null}
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
