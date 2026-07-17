"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ComboboxOption {
	value: string;
	label: string;
	disabled?: boolean;
}

type ComboboxBaseProps = {
	options: ComboboxOption[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	disabled?: boolean;
	className?: string;
	id?: string;
	name?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
	"aria-describedby"?: string;
};

type ComboboxSingleProps = ComboboxBaseProps & {
	multiple?: false;
	value?: string;
	onValueChange?: (value: string) => void;
};

type ComboboxMultipleProps = ComboboxBaseProps & {
	multiple: true;
	value?: string[];
	onValueChange?: (value: string[]) => void;
};

type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

function Combobox(props: ComboboxProps) {
	const {
		options,
		placeholder = "Select option...",
		searchPlaceholder = "Search options...",
		emptyMessage = "No options found.",
		disabled = false,
		className,
		id,
		name,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledBy,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
	} = props;

	const multiple = props.multiple === true;
	const [open, setOpen] = React.useState(false);
	const [searchValue, setSearchValue] = React.useState("");

	const selectedValues = multiple
		? (props.value ?? [])
		: props.value
			? [props.value]
			: [];

	const selectedOptions = options.filter((option) =>
		selectedValues.includes(option.value),
	);

	const handleSelect = (optionValue: string) => {
		if (multiple) {
			const current = props.value ?? [];
			const next = current.includes(optionValue)
				? current.filter((item) => item !== optionValue)
				: [...current, optionValue];
			props.onValueChange?.(next);
			setSearchValue("");
			return;
		}

		const next = optionValue === props.value ? "" : optionValue;
		props.onValueChange?.(next);
		setOpen(false);
		setSearchValue("");
	};

	const removeValue = (optionValue: string) => {
		if (!multiple) return;
		const current = props.value ?? [];
		props.onValueChange?.(current.filter((item) => item !== optionValue));
	};

	const triggerLabel = multiple
		? selectedOptions.length > 0
			? `${selectedOptions.length} selected`
			: placeholder
		: (selectedOptions[0]?.label ?? placeholder);

	const hasExplicitAccessibleName =
		(typeof ariaLabel === "string" && ariaLabel.trim().length > 0) ||
		(typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			{name ? (
				<input
					type="hidden"
					name={name}
					value={multiple ? selectedValues.join(",") : (props.value ?? "")}
					readOnly
				/>
			) : null}
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-label={
						hasExplicitAccessibleName
							? ariaLabel?.trim() || undefined
							: triggerLabel
					}
					aria-labelledby={
						hasExplicitAccessibleName
							? ariaLabelledBy?.trim() || undefined
							: undefined
					}
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-multiselectable={multiple || undefined}
					aria-invalid={ariaInvalid}
					aria-describedby={ariaDescribedBy}
					disabled={disabled}
					className={cn(
						"h-auto min-h-[var(--control-height)] w-full justify-between",
						selectedOptions.length === 0 && "text-muted-foreground",
						className,
					)}
				>
					<span className="flex flex-1 flex-wrap items-center gap-1 text-left">
						{multiple && selectedOptions.length > 0
							? selectedOptions.map((option) => (
									<Badge
										key={option.value}
										variant="secondary"
										className="gap-1"
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											removeValue(option.value);
										}}
									>
										{option.label}
										<XIcon className="size-3" aria-hidden="true" />
										<span className="sr-only">Remove {option.label}</span>
									</Badge>
								))
							: triggerLabel}
					</span>
					<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={searchPlaceholder}
						value={searchValue}
						onValueChange={setSearchValue}
					/>
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options
								.filter((option) =>
									option.label
										.toLowerCase()
										.includes(searchValue.toLowerCase()),
								)
								.map((option) => {
									const selected = selectedValues.includes(option.value);
									return (
										<CommandItem
											key={option.value}
											value={option.value}
											disabled={option.disabled}
											onSelect={() => handleSelect(option.value)}
										>
											<CheckIcon
												className={cn(
													"mr-2 h-4 w-4",
													selected ? "opacity-100" : "opacity-0",
												)}
											/>
											{option.label}
										</CommandItem>
									);
								})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { Combobox, type ComboboxOption };
