"use client";

import {
	cloneElement,
	isValidElement,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Badge } from "../../../components/ui/badge";
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
	const [open, setOpen] = useState(false);
	const lastTriggerRef = useRef<HTMLElement | null>(null);

	const setDialogOpen = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			onOpenChange?.(nextOpen);
			if (!nextOpen) {
				lastTriggerRef.current?.focus();
			}
		},
		[onOpenChange],
	);
	const openDialog = useCallback(() => setDialogOpen(true), [setDialogOpen]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setDialogOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, setDialogOpen]);

	const triggerElement = isValidElement<{
		onClick?: (event: MouseEvent) => void;
	}>(trigger) ? (
		cloneElement(trigger, {
			onClick: (event: MouseEvent) => {
				if (event.currentTarget instanceof HTMLElement) {
					lastTriggerRef.current = event.currentTarget;
				}
				trigger.props.onClick?.(event);
				setDialogOpen(true);
			},
		})
	) : (
		<button onClick={openDialog} type="button">
			{trigger}
		</button>
	);

	return (
		<>
			{triggerElement}
			{open ? (
				<dialog
					aria-label="Activity"
					className="fixed inset-0 z-50 bg-background/80 p-6"
					open
				>
					<div className="mx-auto max-w-lg rounded-lg border bg-popover p-4 shadow-lg">
						<h2>Activity</h2>
						{activities.length === 0 ? (
							<Empty title={emptyMessage} />
						) : (
							<ScrollArea className="max-h-96">
								<ol aria-label="Recent activity">
									{activities.map((activity) => {
										const tags = Array.from(
											new Set(
												activity.tags?.map((tag) => tag.trim()).filter(Boolean),
											),
										);
										return (
											<li key={activity.id}>
												<p>
													<strong>{activity.actor.name}</strong>{" "}
													{activity.summary}
												</p>
												<time dateTime={activity.occurredAtDateTime}>
													{activity.occurredAt}
												</time>
												{activity.message ? <p>{activity.message}</p> : null}
												{activity.fileName ? <p>{activity.fileName}</p> : null}
												{tags.length > 0 ? (
													<div>
														{tags.map((tag) => (
															<Badge key={tag}>{tag}</Badge>
														))}
													</div>
												) : null}
											</li>
										);
									})}
								</ol>
							</ScrollArea>
						)}
					</div>
				</dialog>
			) : null}
		</>
	);
}
