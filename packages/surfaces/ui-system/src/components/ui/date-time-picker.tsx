"use client";

import { type ComponentProps, useId } from "react";
import { cn } from "../../lib/utils";
import { Input } from "./input";
import { Label } from "./label";

interface DateTimePickerProps extends Omit<ComponentProps<"input">, "type"> {
	description?: string;
	error?: string;
	label?: string;
}

function DateTimePicker({
	id,
	label,
	description,
	error,
	className,
	...props
}: DateTimePickerProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const descriptionId = description ? `${inputId}-description` : undefined;
	const errorId = error ? `${inputId}-error` : undefined;
	return (
		<div className="grid gap-2">
			{label ? <Label htmlFor={inputId}>{label}</Label> : null}
			<Input
				aria-describedby={
					[descriptionId, errorId].filter(Boolean).join(" ") || undefined
				}
				aria-invalid={error ? true : undefined}
				className={cn(className)}
				id={inputId}
				type="datetime-local"
				{...props}
			/>
			{description ? (
				<p className="text-muted-foreground text-sm" id={descriptionId}>
					{description}
				</p>
			) : null}
			{error ? (
				<p className="text-destructive-subtle-foreground text-sm" id={errorId}>
					{error}
				</p>
			) : null}
		</div>
	);
}

export { DateTimePicker, type DateTimePickerProps };
