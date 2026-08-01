"use client";

import { InboxIcon } from "lucide-react";
import {
	isValidElement,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useState,
} from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../components/ui/dialog";
import { Empty } from "../components/ui/empty";
import { ScrollArea } from "../components/ui/scroll-area";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../components/ui/tabs";

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
	const [category, setCategory] = useState("inbox");
	const handleDecision = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const id = event.currentTarget.dataset.notificationId;
			const decision = event.currentTarget.value;
			if (
				id !== undefined &&
				(decision === "accept" || decision === "decline")
			) {
				onDecision?.(id, decision);
			}
		},
		[onDecision],
	);
	const triggerElement = isValidElement(trigger) ? (
		trigger
	) : (
		<Button type="button" variant="outline">
			{trigger}
		</Button>
	);

	return (
		<Dialog>
			<DialogTrigger asChild>{triggerElement}</DialogTrigger>
			<DialogContent className="gap-0 p-0 sm:max-w-md">
				<DialogHeader className="border-b p-4 text-left">
					<DialogTitle>Notifications</DialogTitle>
					<DialogDescription>
						Review workspace updates and requests.
					</DialogDescription>
				</DialogHeader>
				<Tabs className="gap-0" onValueChange={setCategory} value={category}>
					<div className="border-b px-4 pt-3">
						<TabsList
							aria-label="Notification categories"
							className="w-full"
							variant="line"
						>
							<TabsTrigger value="inbox">Inbox</TabsTrigger>
							<TabsTrigger value="general">General</TabsTrigger>
						</TabsList>
					</div>
					{["inbox", "general"].map((value) => {
						const visible = notifications.filter(
							(notification) => (notification.category ?? "inbox") === value,
						);
						return (
							<TabsContent className="m-0" key={value} value={value}>
								{visible.length === 0 ? (
									<Empty
										description="There are no workspace updates in this category."
										icon={<InboxIcon />}
										size="sm"
										title={emptyMessage}
									/>
								) : (
									<ScrollArea className="max-h-[min(28rem,70vh)]">
										<ul
											aria-label={`${value} notifications`}
											className="flex flex-col"
										>
											{visible.map((notification) => {
												const actorName = notification.actor?.name;
												const fallback =
													notification.actor?.initials ??
													actorName?.slice(0, 2).toUpperCase() ??
													"N";
												return (
													<li
														className="flex gap-3 border-b p-4 last:border-b-0"
														key={notification.id}
													>
														<Avatar size="sm">
															<AvatarFallback>{fallback}</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<p className="text-sm">
																{actorName ? (
																	<strong className="font-medium">
																		{actorName}{" "}
																	</strong>
																) : null}
																{notification.title}
															</p>
															<div className="mt-1 flex items-center gap-2 text-foreground-tertiary text-xs">
																<time
																	dateTime={notification.occurredAtDateTime}
																>
																	{notification.occurredAt}
																</time>
																{notification.read ? (
																	<Badge variant="outline">Read</Badge>
																) : null}
															</div>
															{notification.detail?.kind === "decision" &&
															onDecision ? (
																<div className="mt-3 flex gap-2">
																	<Button
																		data-notification-id={notification.id}
																		onClick={handleDecision}
																		size="sm"
																		type="button"
																		value="accept"
																	>
																		Accept
																	</Button>
																	<Button
																		data-notification-id={notification.id}
																		onClick={handleDecision}
																		size="sm"
																		type="button"
																		value="decline"
																		variant="outline"
																	>
																		Decline
																	</Button>
																</div>
															) : null}
														</div>
													</li>
												);
											})}
										</ul>
									</ScrollArea>
								)}
							</TabsContent>
						);
					})}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
