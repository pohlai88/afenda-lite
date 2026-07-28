"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "./input";
import { Label } from "./label";

interface DateTimePickerProps
	extends Omit<React.ComponentProps<"input">, "type"> {
	label?: string;
	description?: string;
	error?: string;
}

function DateTimePicker({
	id,
	label,
	description,
	error,
	className,
	...props
}: DateTimePickerProps) {
	const generatedId = React.useId();
	const inputId = id ?? generatedId;
	const descriptionId = description ? `${inputId}-description` : undefined;
	const errorId = error ? `${inputId}-error` : undefined;
	return (
		<div className="grid gap-2">
			{label ? <Label htmlFor={inputId}>{label}</Label> : null}
			<Input
				id={inputId}
				type="datetime-local"
				className={cn(className)}
				aria-invalid={error ? true : undefined}
				aria-describedby={
					[descriptionId, errorId].filter(Boolean).join(" ") || undefined
				}
				{...props}
			/>
			{description ? (
				<p id={descriptionId} className="text-sm text-muted-foreground">
					{description}
				</p>
			) : null}
			{error ? (
				<p id={errorId} className="text-sm text-destructive-subtle-foreground">
					{error}
				</p>
			) : null}
		</div>
	);
}

export { DateTimePicker, type DateTimePickerProps };
