"use client";

import {
	cloneElement,
	isValidElement,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

export type NotificationDropdownItem = Readonly<{
	id: string;
	category?: "inbox" | "general" | string;
	actor?: { name: string; initials?: string };
	title: string;
	occurredAt: string;
	occurredAtDateTime?: string;
	read?: boolean;
	detail?: { kind: "decision" | string };
}>;

export function NotificationDropdown({
	emptyMessage = "No notifications",
	notifications,
	onDecision,
	trigger,
}: Readonly<{
	emptyMessage?: string;
	notifications: readonly NotificationDropdownItem[];
	onDecision?: (id: string, decision: "accept" | "decline") => void;
	trigger: ReactNode;
}>) {
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState("inbox");
	const openNotifications = useCallback(() => setOpen(true), []);
	const handleCategoryChange = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			setCategory(event.currentTarget.value),
		[],
	);
	const handleDecision = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const { notificationId } = event.currentTarget.dataset;
			const decision = event.currentTarget.value;
			if (
				notificationId !== undefined &&
				(decision === "accept" || decision === "decline")
			) {
				onDecision?.(notificationId, decision);
			}
		},
		[onDecision],
	);
	const visible = notifications.filter(
		(notification) => (notification.category ?? "inbox") === category,
	);
	useEffect(() => {
		if (!open) {
			return;
		}
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [open]);
	const triggerElement = isValidElement<{
		onClick?: (event: MouseEvent) => void;
	}>(trigger) ? (
		cloneElement(trigger, {
			onClick: (event: MouseEvent) => {
				trigger.props.onClick?.(event);
				setOpen(true);
			},
		})
	) : (
		<button onClick={openNotifications} type="button">
			{trigger}
		</button>
	);

	return (
		<>
			{triggerElement}
			{open ? (
				<dialog
					aria-label="Notifications"
					className="fixed inset-0 z-50 bg-background/80 p-6"
					open
				>
					<div className="mx-auto max-w-md rounded-lg border bg-popover p-4 shadow-lg">
						<div aria-label="Notification categories" role="tablist">
							{["inbox", "general"].map((value) => (
								<button
									aria-selected={category === value}
									key={value}
									onClick={handleCategoryChange}
									role="tab"
									type="button"
									value={value}
								>
									{value === "inbox" ? "Inbox" : "General"}
								</button>
							))}
						</div>
						{visible.length === 0 ? (
							<section aria-label={emptyMessage}>
								<h3>{emptyMessage}</h3>
							</section>
						) : (
							<ul>
								{visible.map((notification) => (
									<li key={notification.id}>
										<p>
											{notification.actor?.name ? (
												<strong>{notification.actor.name} </strong>
											) : null}
											{notification.title}
										</p>
										<time dateTime={notification.occurredAtDateTime}>
											{notification.occurredAt}
										</time>
										{notification.read ? <Badge>Read</Badge> : null}
										{notification.detail?.kind === "decision" ? (
											<div>
												<Button
													data-notification-id={notification.id}
													onClick={handleDecision}
													type="button"
													value="accept"
												>
													Accept
												</Button>
												<Button
													data-notification-id={notification.id}
													onClick={handleDecision}
													type="button"
													value="decline"
													variant="outline"
												>
													Decline
												</Button>
											</div>
										) : null}
									</li>
								))}
							</ul>
						)}
					</div>
				</dialog>
			) : null}
		</>
	);
}
