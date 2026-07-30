import type * as React from "react";
import { cn } from "../../lib/utils";

type StepStatus = "complete" | "current" | "upcoming" | "error";

const STATUS_MARKERS: Record<StepStatus, string> = {
	complete: "✓",
	current: "•",
	error: "!",
	upcoming: "•",
};

interface StepperStepProps extends Omit<React.ComponentProps<"li">, "title"> {
	description?: React.ReactNode;
	status: StepStatus;
	title: React.ReactNode;
}

function StepperStep({
	status,
	title,
	description,
	className,
	...props
}: StepperStepProps) {
	return (
		<li
			aria-current={status === "current" ? "step" : undefined}
			className={cn("relative flex min-w-0 flex-1 gap-3", className)}
			{...props}
		>
			<span
				aria-hidden="true"
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-semibold text-xs",
					status === "complete" &&
						"border-success-border bg-success-subtle text-success-subtle-foreground",
					status === "current" &&
						"border-primary bg-primary text-primary-foreground",
					status === "error" &&
						"border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground",
					status === "upcoming" &&
						"border-border bg-muted text-muted-foreground",
				)}
			>
				{STATUS_MARKERS[status]}
			</span>
			<div className="min-w-0">
				<div className="font-medium text-sm">{title}</div>
				{description ? (
					<div className="text-muted-foreground text-sm">{description}</div>
				) : null}
			</div>
		</li>
	);
}

function Stepper({ className, ...props }: React.ComponentProps<"ol">) {
	return (
		<ol
			className={cn("flex flex-col gap-4 sm:flex-row", className)}
			{...props}
		/>
	);
}

export { Stepper, StepperStep };
