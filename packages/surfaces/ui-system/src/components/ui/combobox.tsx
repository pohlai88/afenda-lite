"use client";

import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { type MouseEvent, useCallback, useState } from "react";
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
	disabled?: boolean;
	label: string;
	value: string;
}

interface ComboboxBaseProps {
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
	"aria-label"?: string;
	"aria-labelledby"?: string;
	className?: string;
	disabled?: boolean;
	emptyMessage?: string;
	/** `client` (default) filters labels locally; `none` shows `options` as-is. */
	filterMode?: "client" | "none";
	id?: string;
	name?: string;
	/** Fires on search input change (after local state updates). */
	onSearchChange?: (query: string) => void;
	options: ComboboxOption[];
	placeholder?: string;
	searchPlaceholder?: string;
}

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

// The discriminated single/multiple control flow stays colocated so callback payloads remain type-safe.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Splitting this renderer would erase the union narrowing that governs value updates.
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
		filterMode = "client",
		onSearchChange,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledBy,
		"aria-invalid": ariaInvalid,
		"aria-describedby": ariaDescribedBy,
	} = props;

	const multiple = props.multiple === true;
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	const handleSearchChange = useCallback(
		(next: string) => {
			setSearchValue(next);
			onSearchChange?.(next);
		},
		[onSearchChange],
	);

	const visibleOptions =
		filterMode === "none"
			? options
			: options.filter((option) =>
					option.label.toLowerCase().includes(searchValue.toLowerCase()),
				);

	let selectedValues: string[];
	if (multiple) {
		selectedValues = props.value ?? [];
	} else {
		selectedValues = props.value ? [props.value] : [];
	}

	const selectedOptions = options.filter((option) =>
		selectedValues.includes(option.value),
	);

	const handleSelect = useCallback(
		(optionValue: string) => {
			if (multiple) {
				const current = props.value ?? [];
				const next = current.includes(optionValue)
					? current.filter((item) => item !== optionValue)
					: [...current, optionValue];
				props.onValueChange?.(next);
				handleSearchChange("");
				return;
			}

			const next = optionValue === props.value ? "" : optionValue;
			props.onValueChange?.(next);
			setOpen(false);
			handleSearchChange("");
		},
		[handleSearchChange, multiple, props],
	);

	const removeValue = useCallback(
		(optionValue: string) => {
			if (!multiple) {
				return;
			}
			const current = props.value ?? [];
			props.onValueChange?.(current.filter((item) => item !== optionValue));
		},
		[multiple, props],
	);
	const handleRemoveClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			event.preventDefault();
			event.stopPropagation();
			const optionValue = event.currentTarget.dataset.value;
			if (optionValue !== undefined) {
				removeValue(optionValue);
			}
		},
		[removeValue],
	);

	let triggerLabel = selectedOptions[0]?.label ?? placeholder;
	if (multiple) {
		triggerLabel =
			selectedOptions.length > 0
				? `${selectedOptions.length} selected`
				: placeholder;
	}

	const hasExplicitAccessibleName =
		(typeof ariaLabel === "string" && ariaLabel.trim().length > 0) ||
		(typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			{name ? (
				<input
					name={name}
					readOnly
					type="hidden"
					value={multiple ? selectedValues.join(",") : (props.value ?? "")}
				/>
			) : null}
			<PopoverTrigger asChild>
				<Button
					aria-describedby={ariaDescribedBy}
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-invalid={ariaInvalid}
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
					className={cn(
						"h-auto min-h-(--control-height) w-full justify-between",
						selectedOptions.length === 0 && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
					id={id}
					role="combobox"
					type="button"
					variant="outline"
				>
					<span className="flex flex-1 flex-wrap items-center gap-1 text-left">
						{multiple && selectedOptions.length > 0
							? selectedOptions.map((option) => (
									<Badge
										className="gap-1"
										data-value={option.value}
										key={option.value}
										onClick={handleRemoveClick}
										variant="secondary"
									>
										{option.label}
										<XIcon aria-hidden="true" className="size-3" />
										<span className="sr-only">Remove {option.label}</span>
									</Badge>
								))
							: triggerLabel || null}
					</span>
					<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) p-0"
			>
				<Command shouldFilter={false}>
					<CommandInput
						onValueChange={handleSearchChange}
						placeholder={searchPlaceholder}
						value={searchValue}
					/>
					<CommandList aria-multiselectable={multiple || undefined}>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{visibleOptions.map((option) => {
								const selected = selectedValues.includes(option.value);
								return (
									<CommandItem
										key={option.value}
										value={option.value}
										{...(option.disabled === undefined
											? {}
											: { disabled: option.disabled })}
										onSelect={handleSelect}
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
