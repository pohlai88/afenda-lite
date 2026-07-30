"use client";

import type * as React from "react";
import { cn } from "../../lib/utils";
import { Input } from "./input";

interface NumericInputProps
	extends Omit<React.ComponentProps<"input">, "prefix" | "type"> {
	prefix?: React.ReactNode;
	suffix?: React.ReactNode;
}

function NumberInput({
	prefix,
	suffix,
	className,
	...props
}: NumericInputProps) {
	return (
		<div className="relative flex items-center">
			{prefix ? (
				<span className="pointer-events-none absolute left-3 text-muted-foreground text-sm">
					{prefix}
				</span>
			) : null}
			<Input
				className={cn(prefix && "pl-9", suffix && "pr-12", className)}
				inputMode="decimal"
				type="number"
				{...props}
			/>
			{suffix ? (
				<span className="pointer-events-none absolute right-3 text-muted-foreground text-sm">
					{suffix}
				</span>
			) : null}
		</div>
	);
}

function MoneyInput({
	currency = "USD",
	...props
}: NumericInputProps & { currency?: string }) {
	return <NumberInput prefix={currency} step="0.01" {...props} />;
}

function QuantityInput({
	unit,
	...props
}: NumericInputProps & { unit?: string }) {
	return <NumberInput suffix={unit} {...props} />;
}

function PercentInput(props: NumericInputProps) {
	return <NumberInput max="100" min="0" step="0.01" suffix="%" {...props} />;
}

export {
	MoneyInput,
	NumberInput,
	type NumericInputProps,
	PercentInput,
	QuantityInput,
};
