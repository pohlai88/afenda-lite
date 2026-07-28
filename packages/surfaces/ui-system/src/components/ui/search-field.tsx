"use client";

import { SearchIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";

interface SearchFieldProps extends Omit<React.ComponentProps<"input">, "type"> {
	onClear?: () => void;
}

function SearchField({
	className,
	value,
	onClear,
	...props
}: SearchFieldProps) {
	const hasValue = typeof value === "string" && value.length > 0;
	return (
		<div className={cn("relative", className)}>
			<SearchIcon
				className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<Input
				type="search"
				value={value}
				className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
				{...props}
			/>
			{onClear && hasValue ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="absolute right-1 top-1/2 -translate-y-1/2"
					onClick={onClear}
					aria-label="Clear search"
				>
					<XIcon aria-hidden="true" />
				</Button>
			) : null}
		</div>
	);
}

export { SearchField };
