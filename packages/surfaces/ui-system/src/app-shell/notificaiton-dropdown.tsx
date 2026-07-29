"use client";

import {
	cloneElement,
	isValidElement,
	type MouseEvent,
	type ReactNode,
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
	const visible = notifications.filter(
		(notification) => (notification.category ?? "inbox") === category,
	);
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
		<button type="button" onClick={() => setOpen(true)}>
			{trigger}
		</button>
	);

	return (
		<>
			{triggerElement}
			{open ? (
				<div
					role="dialog"
					aria-label="Notifications"
					className="fixed inset-0 z-50 bg-background/80 p-6"
					onKeyDown={(event) => {
						if (event.key === "Escape") {
							setOpen(false);
						}
					}}
				>
					<div className="mx-auto max-w-md rounded-lg border bg-popover p-4 shadow-lg">
						<div role="tablist" aria-label="Notification categories">
							{["inbox", "general"].map((value) => (
								<button
									key={value}
									type="button"
									role="tab"
									aria-selected={category === value}
									onClick={() => setCategory(value)}
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
													type="button"
													onClick={() =>
														onDecision?.(notification.id, "accept")
													}
												>
													Accept
												</Button>
												<Button
													type="button"
													variant="outline"
													onClick={() =>
														onDecision?.(notification.id, "decline")
													}
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
				</div>
			) : null}
		</>
	);
}
