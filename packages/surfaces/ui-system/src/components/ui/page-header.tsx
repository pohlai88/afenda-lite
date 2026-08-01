import type * as React from "react";
import { cn } from "../../lib/utils";

function PageHeader({ className, ...props }: React.ComponentProps<"header">) {
	return (
		<header
			className={cn(
				"flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between",
				className,
			)}
			{...props}
		/>
	);
}

function PageHeaderHeading({
	className,
	...props
}: React.ComponentProps<"h1">) {
	return (
		<h1
			className={cn("font-semibold text-2xl tracking-tight", className)}
			{...props}
		/>
	);
}

function PageHeaderDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={cn("max-w-3xl text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function PageHeaderActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
			{...props}
		/>
	);
}

function SectionHeader({
	className,
	...props
}: React.ComponentProps<"header">) {
	return (
		<header
			className={cn(
				"flex flex-wrap items-start justify-between gap-3",
				className,
			)}
			{...props}
		/>
	);
}

interface EntityHeaderProps
	extends Omit<React.ComponentProps<"header">, "title"> {
	actions?: React.ReactNode;
	description?: React.ReactNode;
	metadata?: React.ReactNode;
	status?: React.ReactNode;
	title: React.ReactNode;
}

function EntityHeader({
	title,
	description,
	status,
	metadata,
	actions,
	className,
	...props
}: EntityHeaderProps) {
	return (
		<header
			className={cn(
				"flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between",
				className,
			)}
			{...props}
		>
			<div className="grid min-w-0 gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
					{status}
				</div>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
				{metadata ? (
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm">
						{metadata}
					</div>
				) : null}
			</div>
			{actions ? <PageHeaderActions>{actions}</PageHeaderActions> : null}
		</header>
	);
}

export {
	EntityHeader,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	SectionHeader,
};
