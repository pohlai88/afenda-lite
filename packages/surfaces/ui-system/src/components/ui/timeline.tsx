import type * as React from "react";
import { cn } from "../../lib/utils";

interface TimelineEntryProps extends Omit<React.ComponentProps<"li">, "title"> {
	title: React.ReactNode;
	timestamp?: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
}

function TimelineEntry({
	title,
	timestamp,
	description,
	icon,
	className,
	...props
}: TimelineEntryProps) {
	return (
		<li
			className={cn(
				"relative grid grid-cols-[1.5rem_1fr] gap-3 pb-6 last:pb-0",
				className,
			)}
			{...props}
		>
			<div className="flex justify-center">
				<span
					className="z-10 flex size-6 items-center justify-center rounded-full border bg-background text-xs"
					aria-hidden="true"
				>
					{icon ?? "•"}
				</span>
			</div>
			<div className="min-w-0">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<p className="text-sm font-medium">{title}</p>
					{timestamp ? (
						<time className="text-xs text-muted-foreground">{timestamp}</time>
					) : null}
				</div>
				{description ? (
					<div className="mt-1 text-sm text-muted-foreground">
						{description}
					</div>
				) : null}
			</div>
		</li>
	);
}

function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
	return (
		<ol
			className={cn(
				"relative [&>li:not(:last-child)]:after:absolute [&>li:not(:last-child)]:after:bottom-0 [&>li:not(:last-child)]:after:left-3 [&>li:not(:last-child)]:after:top-6 [&>li:not(:last-child)]:after:w-px [&>li:not(:last-child)]:after:bg-border",
				className,
			)}
			{...props}
		/>
	);
}

interface AuditTrailEntry extends TimelineEntryProps {
	actor: React.ReactNode;
	action: React.ReactNode;
}

function AuditTrail({
	entries,
	className,
	...props
}: React.ComponentProps<"ol"> & { entries: readonly AuditTrailEntry[] }) {
	return (
		<Timeline className={className} {...props}>
			{entries.map((entry, index) => (
				<TimelineEntry
					key={index}
					{...entry}
					title={
						<>
							<span className="font-semibold">{entry.actor}</span>{" "}
							{entry.action}
						</>
					}
				/>
			))}
		</Timeline>
	);
}

export { AuditTrail, type AuditTrailEntry, Timeline, TimelineEntry };
