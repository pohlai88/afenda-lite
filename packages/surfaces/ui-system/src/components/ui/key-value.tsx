"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
	type HTMLAttributes,
	type ReactNode,
	type RefObject,
	useCallback,
} from "react";
import { cn } from "../../lib/utils";

const keyValueVariants = cva("flex flex-col gap-1", {
	variants: {
		orientation: {
			vertical: "flex-col",
			horizontal: "flex-row items-center justify-between",
			inline: "flex-row items-center gap-2",
		},
		size: {
			sm: "text-sm",
			md: "text-base",
			lg: "text-lg",
		},
	},
	defaultVariants: {
		orientation: "vertical",
		size: "md",
	},
});

interface KeyValuePairProps extends VariantProps<typeof keyValueVariants> {
	children?: ReactNode;
	className?: string;
	copyable?: boolean;
	label: string;
	loading?: boolean;
	value?: ReactNode;
}

function KeyValuePair({
	className,
	orientation,
	size,
	label,
	value,
	copyable = false,
	loading = false,
	children,
}: KeyValuePairProps) {
	const content = value ?? children;

	const handleCopy = useCallback(async () => {
		if (copyable && content && typeof content === "string") {
			try {
				await navigator.clipboard.writeText(content);
			} catch (err) {
				console.warn("Failed to copy to clipboard:", err);
			}
		}
	}, [copyable, content]);
	let renderedContent: ReactNode = content || (
		<span className="text-muted-foreground italic">—</span>
	);
	if (loading) {
		renderedContent = (
			<div className="h-4 w-16 animate-pulse rounded bg-muted" />
		);
	} else if (copyable && typeof content === "string") {
		renderedContent = (
			<button
				className="cursor-pointer text-left underline-offset-4 transition-colors hover:text-primary hover:underline"
				onClick={handleCopy}
				title={`Copy ${label}`}
				type="button"
			>
				{content}
			</button>
		);
	}

	return (
		<div className={cn(keyValueVariants({ orientation, size }), className)}>
			<dt className="font-medium text-muted-foreground">{label}</dt>
			<dd className="text-foreground">{renderedContent}</dd>
		</div>
	);
}

interface KeyValueProps
	extends HTMLAttributes<HTMLDListElement>,
		VariantProps<typeof keyValueVariants> {
	copyable?: boolean;
	label: string;
	loading?: boolean;
	value?: ReactNode;
}

const KeyValue = ({
	className,
	orientation,
	size,
	label,
	value,
	copyable = false,
	loading = false,
	children,
	ref,
	...props
}: KeyValueProps & { ref?: RefObject<HTMLDListElement | null> }) => (
	<dl className={cn(className)} ref={ref} {...props}>
		<KeyValuePair
			copyable={copyable}
			label={label}
			loading={loading}
			orientation={orientation}
			size={size}
			value={value}
		>
			{children}
		</KeyValuePair>
	</dl>
);
KeyValue.displayName = "KeyValue";

interface KeyValueListProps extends HTMLAttributes<HTMLDListElement> {
	items: Array<{
		label: string;
		value?: ReactNode;
		copyable?: boolean;
		loading?: boolean;
	}>;
	orientation?: VariantProps<typeof keyValueVariants>["orientation"];
	size?: VariantProps<typeof keyValueVariants>["size"];
}

const KeyValueList = ({
	className,
	items,
	orientation,
	size,
	ref,
	...props
}: KeyValueListProps & { ref?: RefObject<HTMLDListElement | null> }) => (
	<dl className={cn("space-y-3", className)} ref={ref} {...props}>
		{items.map((item, index) => (
			<KeyValuePair
				key={`${item.label}-${index}`}
				orientation={orientation}
				size={size}
				{...item}
			/>
		))}
	</dl>
);
KeyValueList.displayName = "KeyValueList";

export { KeyValue, KeyValueList, keyValueVariants };
