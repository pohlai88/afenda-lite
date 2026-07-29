import {
	CircleCheck,
	CircleX,
	Info,
	Lightbulb,
	TriangleAlert,
} from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";

export type CalloutType =
	| "info"
	| "warn"
	| "error"
	| "success"
	| "warning"
	| "idea";

const iconClass = "size-5 -me-0.5 fill-(--callout-color) text-fd-card";

export function Callout({
	children,
	title,
	...props
}: { title?: ReactNode } & Omit<CalloutContainerProps, "title">) {
	return (
		<CalloutContainer {...props}>
			{title ? <CalloutTitle>{title}</CalloutTitle> : null}
			<CalloutDescription>{children}</CalloutDescription>
		</CalloutContainer>
	);
}

export interface CalloutContainerProps extends ComponentProps<"div"> {
	/**
	 * Force an icon
	 */
	icon?: ReactNode;
	/**
	 * @defaultValue info
	 */
	type?: CalloutType;
}

function resolveAlias(type: CalloutType) {
	if (type === "warn") {
		return "warning";
	}
	if ((type as unknown) === "tip") {
		return "info";
	}
	return type;
}

export function CalloutContainer({
	type: inputType = "info",
	icon,
	children,
	className,
	style,
	...props
}: CalloutContainerProps) {
	const type = resolveAlias(inputType);

	return (
		<div
			className={cn(
				"my-4 flex gap-2 rounded-xl border bg-fd-card p-3 ps-1 text-fd-card-foreground text-sm shadow-md",
				className,
			)}
			style={
				{
					"--callout-color": `var(--color-fd-${type}, var(--color-fd-muted))`,
					...style,
				} as CSSProperties
			}
			{...props}
		>
			<div className="w-0.5 rounded-sm bg-(--callout-color)/50" role="none" />
			{icon ??
				{
					info: <Info className={iconClass} />,
					warning: <TriangleAlert className={iconClass} />,
					error: <CircleX className={iconClass} />,
					success: <CircleCheck className={iconClass} />,
					idea: (
						<Lightbulb className="-me-0.5 size-5 fill-(--callout-color) text-(--callout-color)" />
					),
				}[type]}
			<div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
		</div>
	);
}

export function CalloutTitle({
	children,
	className,
	...props
}: ComponentProps<"p">) {
	return (
		<p className={cn("my-0! font-medium", className)} {...props}>
			{children}
		</p>
	);
}

export function CalloutDescription({
	children,
	className,
	...props
}: ComponentProps<"p">) {
	return (
		<div
			className={cn(
				"prose-no-margin text-fd-muted-foreground empty:hidden",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
