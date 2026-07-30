"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { type ComponentProps, useMemo } from "react";

import { cn } from "../../lib/utils";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
	const _values = useMemo(() => {
		if (Array.isArray(value)) {
			return value;
		}
		if (Array.isArray(defaultValue)) {
			return defaultValue;
		}
		return [min, max];
	}, [value, defaultValue, min, max]);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			{...(defaultValue === undefined ? {} : { defaultValue })}
			{...(value === undefined ? {} : { value })}
			className={cn(
				"relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
				className,
			)}
			max={max}
			min={min}
			{...props}
		>
			<SliderPrimitive.Track
				className={cn(
					"relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5",
				)}
				data-slot="slider-track"
			>
				<SliderPrimitive.Range
					className={cn(
						"absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
					)}
					data-slot="slider-range"
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: _values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={index}
					{...(ariaLabel === undefined
						? {}
						: {
								"aria-label":
									_values.length > 1 ? `${ariaLabel} ${index + 1}` : ariaLabel,
							})}
					{...(ariaLabelledBy === undefined
						? {}
						: { "aria-labelledby": ariaLabelledBy })}
					className="block size-4 shrink-0 rounded-full border border-primary bg-background ring-ring-focus transition-[color,box-shadow] hover:ring-4 focus-visible:outline-hidden focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };
