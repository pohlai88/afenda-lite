import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** form-layout-08 — two-column wizard shell from Shadcn Studio stepper block. */
export type StudioFormLayoutWizardShellProps = {
  header?: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  contentClassName?: string;
};

export function StudioFormLayoutWizardShell({
  header,
  sidebar,
  children,
  contentRef,
  contentClassName,
}: StudioFormLayoutWizardShellProps) {
  return (
    <Card className="min-w-0 gap-0 p-0 md:grid md:max-lg:grid-cols-5 lg:grid-cols-4">
      {header ? (
        <CardHeader className="border-b md:col-span-full">{header}</CardHeader>
      ) : null}
      <CardContent className="col-span-5 min-w-0 overflow-hidden border-b p-4 md:max-lg:col-span-2 md:border-r md:p-6 lg:col-span-1 lg:border-b-0">
        {sidebar}
      </CardContent>
      <CardContent
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          "col-span-5 flex min-w-0 flex-col gap-6 p-6 md:col-span-3 lg:col-span-3",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export type StudioFormLayoutWizardStepProps = {
  title: string;
  description: string;
  icon: ReactNode;
  active?: boolean;
  complete?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

export function StudioFormLayoutWizardStep({
  title,
  description,
  icon,
  active = false,
  complete = false,
  disabled = false,
  onSelect,
}: StudioFormLayoutWizardStepProps) {
  return (
    <li className="min-w-0">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto w-full min-w-0 items-start justify-start gap-3 overflow-hidden whitespace-normal rounded px-2 py-2 text-left",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={onSelect}
        disabled={disabled}
        aria-current={active ? "step" : undefined}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            active || complete
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-pretty">{title}</span>
          <span className="block text-xs text-muted-foreground text-pretty break-words">
            {description}
          </span>
        </span>
      </Button>
    </li>
  );
}

export default StudioFormLayoutWizardShell;
