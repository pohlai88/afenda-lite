import type * as React from "react";
import { cn } from "../../lib/utils";

type StepStatus = "complete" | "current" | "upcoming" | "error";

interface StepperStepProps extends Omit<React.ComponentProps<"li">, "title"> {
	status: StepStatus;
	title: React.ReactNode;
	description?: React.ReactNode;
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
			className={cn("relative flex min-w-0 flex-1 gap-3", className)}
			aria-current={status === "current" ? "step" : undefined}
			{...props}
		>
			<span
				aria-hidden="true"
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
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
				{status === "complete" ? "✓" : status === "error" ? "!" : "•"}
			</span>
			<div className="min-w-0">
				<div className="text-sm font-medium">{title}</div>
				{description ? (
					<div className="text-sm text-muted-foreground">{description}</div>
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
