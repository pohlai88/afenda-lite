"use client";

import { isValidElement, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../../components/ui/dialog";
import { Empty } from "../../../components/ui/empty";
import { ScrollArea } from "../../../components/ui/scroll-area";

export type ActivityDialogItem = Readonly<{
	id: string;
	kind: "message" | "attachment" | "tags" | "plain" | string;
	actor: { name: string; initials?: string };
	summary: string;
	occurredAt: string;
	occurredAtDateTime?: string;
	message?: string;
	fileName?: string;
	tags?: readonly string[];
}>;

export function ActivityDialog({
	activities,
	emptyMessage = "No activity yet",
	onOpenChange,
	trigger,
}: Readonly<{
	activities: readonly ActivityDialogItem[];
	emptyMessage?: string;
	onOpenChange?: (open: boolean) => void;
	trigger: ReactNode;
}>) {
	const triggerElement = isValidElement(trigger) ? (
		trigger
	) : (
		<Button type="button" variant="outline">
			{trigger}
		</Button>
	);

	return (
		<Dialog {...(onOpenChange === undefined ? {} : { onOpenChange })}>
			<DialogTrigger asChild>{triggerElement}</DialogTrigger>
			<DialogContent className="gap-0 p-0 sm:max-w-lg">
				<DialogHeader className="border-b p-4 text-left">
					<DialogTitle>Activity</DialogTitle>
					<DialogDescription>
						Recent record and workflow history.
					</DialogDescription>
				</DialogHeader>
				{activities.length === 0 ? (
					<Empty
						description="New events will appear here when work is recorded."
						size="sm"
						title={emptyMessage}
					/>
				) : (
					<ScrollArea className="max-h-[min(32rem,70vh)]">
						<ol aria-label="Recent activity" className="flex flex-col">
							{activities.map((activity) => {
								const tags = Array.from(
									new Set(
										activity.tags?.map((tag) => tag.trim()).filter(Boolean),
									),
								);
								const fallback =
									activity.actor.initials ??
									activity.actor.name.slice(0, 2).toUpperCase();
								return (
									<li
										className="flex gap-3 border-b p-4 last:border-b-0"
										key={activity.id}
									>
										<Avatar size="sm">
											<AvatarFallback>{fallback}</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="text-sm">
												<strong className="font-medium">
													{activity.actor.name}
												</strong>{" "}
												{activity.summary}
											</p>
											<time
												className="mt-1 block text-foreground-tertiary text-xs"
												dateTime={activity.occurredAtDateTime}
											>
												{activity.occurredAt}
											</time>
											{activity.message ? (
												<p className="mt-3 rounded-md bg-surface-sunken p-3 text-sm">
													{activity.message}
												</p>
											) : null}
											{activity.fileName ? (
												<p className="mt-3 truncate rounded-md border px-3 py-2 font-mono text-xs">
													{activity.fileName}
												</p>
											) : null}
											{tags.length > 0 ? (
												<div className="mt-3 flex flex-wrap gap-2">
													{tags.map((tag) => (
														<Badge key={tag} variant="secondary">
															{tag}
														</Badge>
													))}
												</div>
											) : null}
										</div>
									</li>
								);
							})}
						</ol>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}
