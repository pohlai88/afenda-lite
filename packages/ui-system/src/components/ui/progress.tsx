"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
	value?: number;
	max?: number;
	getValueLabel?: (value: number, max: number) => string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
	({ className, value = 0, max = 100, getValueLabel, ...props }, ref) => {
		const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

		const valueLabel =
			getValueLabel?.(value, max) || `${Math.round(percentage)}%`;

		return (
			<div
				ref={ref}
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={max}
				aria-valuenow={value}
				aria-valuetext={valueLabel}
				className={cn(
					"relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
					className,
				)}
				{...props}
			>
				<div
					className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
					style={{
						transform: `translateX(-${100 - percentage}%)`,
					}}
				/>
			</div>
		);
	},
);
Progress.displayName = "Progress";

export { Progress };
