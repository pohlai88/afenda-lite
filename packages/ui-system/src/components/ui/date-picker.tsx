"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DatePickerProps = {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	"aria-invalid"?: boolean | "true" | "false";
	"aria-describedby"?: string;
};

function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	disabled = false,
	id,
	className,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					aria-expanded={open}
					aria-haspopup="dialog"
					className={cn(
						"h-[var(--control-height)] w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 size-4" aria-hidden="true" />
					{value ? format(value, "PPP") : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={(date) => {
						onChange?.(date);
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export type DateRangeValue = DateRange;

export type DateRangePickerProps = {
	value?: DateRangeValue;
	onChange?: (range: DateRangeValue | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	"aria-invalid"?: boolean | "true" | "false";
	"aria-describedby"?: string;
};

function DateRangePicker({
	value,
	onChange,
	placeholder = "Pick a date range",
	disabled = false,
	id,
	className,
	"aria-invalid": ariaInvalid,
	"aria-describedby": ariaDescribedBy,
}: DateRangePickerProps) {
	const [open, setOpen] = React.useState(false);

	const label =
		value?.from && value?.to
			? `${format(value.from, "LLL dd, y")} – ${format(value.to, "LLL dd, y")}`
			: value?.from
				? format(value.from, "LLL dd, y")
				: placeholder;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					aria-expanded={open}
					aria-haspopup="dialog"
					className={cn(
						"h-[var(--control-height)] w-full justify-start text-left font-normal",
						!value?.from && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 size-4" aria-hidden="true" />
					{label}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="range"
					selected={value}
					onSelect={(range) => {
						onChange?.(range);
						if (range?.from && range?.to) {
							setOpen(false);
						}
					}}
					numberOfMonths={2}
				/>
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker, DateRangePicker };
