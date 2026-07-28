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
				<span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
					{prefix}
				</span>
			) : null}
			<Input
				type="number"
				inputMode="decimal"
				className={cn(prefix && "pl-9", suffix && "pr-12", className)}
				{...props}
			/>
			{suffix ? (
				<span className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
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
	return <NumberInput step="0.01" prefix={currency} {...props} />;
}

function QuantityInput({
	unit,
	...props
}: NumericInputProps & { unit?: string }) {
	return <NumberInput suffix={unit} {...props} />;
}

function PercentInput(props: NumericInputProps) {
	return <NumberInput min="0" max="100" step="0.01" suffix="%" {...props} />;
}

export {
	MoneyInput,
	NumberInput,
	type NumericInputProps,
	PercentInput,
	QuantityInput,
};
