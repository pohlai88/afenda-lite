"use client";

import type { HTMLAttributes, RefObject } from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
	getValueLabel?: (value: number, max: number) => string;
	max?: number;
	value?: number;
}

const Progress = ({
	className,
	value = 0,
	max = 100,
	getValueLabel,
	ref,
	...props
}: ProgressProps & { ref?: RefObject<HTMLDivElement | null> }) => {
	const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

	const valueLabel =
		getValueLabel?.(value, max) || `${Math.round(percentage)}%`;

	return (
		<div
			aria-valuemax={max}
			aria-valuemin={0}
			aria-valuenow={value}
			aria-valuetext={valueLabel}
			className={cn(
				"relative h-2 w-full overflow-hidden rounded-full bg-primary-track",
				className,
			)}
			ref={ref}
			role="progressbar"
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
};
Progress.displayName = "Progress";

export { Progress };
