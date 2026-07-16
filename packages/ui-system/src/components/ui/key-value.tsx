"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
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
	label: string;
	value?: React.ReactNode;
	copyable?: boolean;
	loading?: boolean;
	children?: React.ReactNode;
	className?: string;
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

	const handleCopy = React.useCallback(async () => {
		if (copyable && content && typeof content === "string") {
			try {
				await navigator.clipboard.writeText(content);
			} catch (err) {
				console.warn("Failed to copy to clipboard:", err);
			}
		}
	}, [copyable, content]);

	return (
		<div className={cn(keyValueVariants({ orientation, size }), className)}>
			<dt className="text-muted-foreground font-medium">{label}</dt>
			<dd className="text-foreground">
				{loading ? (
					<div className="h-4 w-16 bg-muted animate-pulse rounded" />
				) : copyable && typeof content === "string" ? (
					<button
						onClick={handleCopy}
						className="text-left hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
						title={`Copy ${label}`}
						type="button"
					>
						{content}
					</button>
				) : (
					content || <span className="text-muted-foreground italic">—</span>
				)}
			</dd>
		</div>
	);
}

interface KeyValueProps
	extends React.HTMLAttributes<HTMLDListElement>,
		VariantProps<typeof keyValueVariants> {
	label: string;
	value?: React.ReactNode;
	copyable?: boolean;
	loading?: boolean;
}

const KeyValue = React.forwardRef<HTMLDListElement, KeyValueProps>(
	(
		{
			className,
			orientation,
			size,
			label,
			value,
			copyable = false,
			loading = false,
			children,
			...props
		},
		ref,
	) => {
		return (
			<dl ref={ref} className={cn(className)} {...props}>
				<KeyValuePair
					orientation={orientation}
					size={size}
					label={label}
					value={value}
					copyable={copyable}
					loading={loading}
				>
					{children}
				</KeyValuePair>
			</dl>
		);
	},
);
KeyValue.displayName = "KeyValue";

interface KeyValueListProps extends React.HTMLAttributes<HTMLDListElement> {
	items: Array<{
		label: string;
		value?: React.ReactNode;
		copyable?: boolean;
		loading?: boolean;
	}>;
	orientation?: VariantProps<typeof keyValueVariants>["orientation"];
	size?: VariantProps<typeof keyValueVariants>["size"];
}

const KeyValueList = React.forwardRef<HTMLDListElement, KeyValueListProps>(
	({ className, items, orientation, size, ...props }, ref) => {
		return (
			<dl ref={ref} className={cn("space-y-3", className)} {...props}>
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
	},
);
KeyValueList.displayName = "KeyValueList";

export { KeyValue, KeyValueList, keyValueVariants };
