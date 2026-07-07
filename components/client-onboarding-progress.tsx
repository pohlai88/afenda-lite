import { portalCopy } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "@/components/ui/timeline";
import { CircleCheckIcon, DotIcon, LoaderIcon } from "lucide-react";

export function ClientOnboardingProgress({
  formStep,
  formStepCount,
}: {
  formStep?: number;
  formStepCount?: number;
} = {}) {
  const { clientOnboarding } = portalCopy;
  const { steps, progressTitle, progressDescription } = clientOnboarding;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="leading-none font-semibold">
          {progressTitle}
        </CardTitle>
        <CardDescription>{progressDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Timeline>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const isCurrent = step.state === "current";
            const isUpcoming = step.state === "upcoming";

            const lineClass = cn(
              "min-h-10",
              isCurrent || isUpcoming
                ? "bg-[repeating-linear-gradient(0deg,var(--border),var(--border)_5px,var(--card)_6px,var(--card)_10px)]"
                : "border",
            );

            return (
              <TimelineItem
                key={step.id}
                status={step.state === "done" ? "done" : "default"}
                className="mt-1 gap-x-0"
              >
                <TimelineDot status="custom" className="mb-1.25">
                  {step.state === "done" ? (
                    <CircleCheckIcon
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                  ) : (
                    <LoaderIcon
                      aria-hidden="true"
                      className={cn(
                        "size-4",
                        isCurrent ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
                </TimelineDot>
                {!isLast ? <TimelineLine className={lineClass} /> : null}
                <TimelineHeading className="ml-4 flex items-center gap-1">
                  <span className="font-medium">{step.title}</span>
                  <DotIcon
                    aria-hidden="true"
                    className="size-2 text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    {step.id === "declarant-profile" &&
                    formStep &&
                    formStepCount
                      ? clientOnboarding.formStepLabel(formStep, formStepCount)
                      : step.statusLabel}
                  </span>
                </TimelineHeading>
                <TimelineContent className={cn("ml-4", isLast && "pb-0")}>
                  <span className="text-sm text-muted-foreground">
                    {step.content}
                  </span>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </CardContent>
    </Card>
  );
}
