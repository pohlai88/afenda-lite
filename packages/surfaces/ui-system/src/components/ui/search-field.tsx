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
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
				type="search"
				value={value}
				{...props}
			/>
			{onClear && hasValue ? (
				<Button
					aria-label="Clear search"
					className="absolute top-1/2 right-1 -translate-y-1/2"
					onClick={onClear}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<XIcon aria-hidden="true" />
				</Button>
			) : null}
		</div>
	);
}

export { SearchField };
