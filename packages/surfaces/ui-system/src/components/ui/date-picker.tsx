"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerProps {
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
	className?: string;
	disabled?: boolean;
	id?: string;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	value?: Date;
}

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
	const [open, setOpen] = useState(false);
	const handleSelect = useCallback(
		(date: Date | undefined) => {
			onChange?.(date);
			setOpen(false);
		},
		[onChange],
	);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-describedby={ariaDescribedBy}
					aria-expanded={open}
					aria-haspopup="dialog"
					aria-invalid={ariaInvalid}
					className={cn(
						"h-(--control-height) w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
					id={id}
					type="button"
					variant="outline"
				>
					<CalendarIcon aria-hidden="true" className="mr-2 size-4" />
					{value ? format(value, "PPP") : String(placeholder ?? "")}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar mode="single" onSelect={handleSelect} selected={value} />
			</PopoverContent>
		</Popover>
	);
}

export type DateRangeValue = DateRange;

export interface DateRangePickerProps {
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
	className?: string;
	disabled?: boolean;
	id?: string;
	onChange?: (range: DateRangeValue | undefined) => void;
	placeholder?: string;
	value?: DateRangeValue;
}

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
	const [open, setOpen] = useState(false);
	const handleSelect = useCallback(
		(range: DateRangeValue | undefined) => {
			onChange?.(range);
			if (range?.from && range.to) {
				setOpen(false);
			}
		},
		[onChange],
	);

	let label = placeholder;
	if (value?.from && value.to) {
		label = `${format(value.from, "LLL dd, y")} – ${format(value.to, "LLL dd, y")}`;
	} else if (value?.from) {
		label = format(value.from, "LLL dd, y");
	}

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-describedby={ariaDescribedBy}
					aria-expanded={open}
					aria-haspopup="dialog"
					aria-invalid={ariaInvalid}
					className={cn(
						"h-(--control-height) w-full justify-start text-left font-normal",
						!value?.from && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
					id={id}
					type="button"
					variant="outline"
				>
					<CalendarIcon aria-hidden="true" className="mr-2 size-4" />
					{label}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					mode="range"
					numberOfMonths={2}
					onSelect={handleSelect}
					selected={value}
				/>
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker, DateRangePicker };
