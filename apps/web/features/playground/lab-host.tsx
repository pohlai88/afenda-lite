"use client";

import { AdminShell } from "@afenda/ui/shell";
import { type ReactNode, useState } from "react";

import type { PlaygroundLab } from "@/features/playground/lab-registry";
import {
	ActivityDialogSubject,
	NotificationDropdownSubject,
	ProfileDropdownSubject,
} from "@/features/playground/lab-subjects";

type HarnessApi = {
	mark: (stepId: string) => void;
	setLastEvent: (message: string) => void;
};

type HeaderSlots = {
	profileSlot?: ReactNode;
	notificationSlot?: ReactNode;
	activitySlot?: ReactNode;
};

function InteractionLabChrome({
	lab,
	instruction,
	headerSlots,
	extraAction,
}: {
	lab: PlaygroundLab;
	instruction: string;
	headerSlots: (api: HarnessApi) => HeaderSlots;
	extraAction?: (api: HarnessApi) => ReactNode;
}) {
	const [checked, setChecked] = useState<Record<string, boolean>>({});
	const [lastEvent, setLastEvent] = useState("No harness events yet.");

	function mark(stepId: string) {
		setChecked((prev) => ({ ...prev, [stepId]: true }));
	}

	const api: HarnessApi = { mark, setLastEvent };
	const slots = headerSlots(api);

	return (
		<AdminShell
			defaultSidebarOpen={false}
			showFooter={false}
			profileSlot={slots.profileSlot}
			notificationSlot={slots.notificationSlot}
			activitySlot={slots.activitySlot}
		>
			<div className="mx-auto flex max-w-2xl flex-col gap-6">
				<header className="flex flex-col gap-2">
					<p className="text-sm text-muted-foreground">Lab · {lab.id}</p>
					<h1 className="text-2xl font-semibold tracking-tight">{lab.title}</h1>
					<p className="text-muted-foreground">{lab.description}</p>
					<p className="font-mono text-xs text-muted-foreground">
						{lab.packagePath}
					</p>
				</header>

				<section
					className="flex flex-col gap-3 rounded-lg border bg-card p-4"
					aria-labelledby="interaction-checklist-heading"
				>
					<h2
						id="interaction-checklist-heading"
						className="text-sm font-medium"
					>
						Interaction checklist
					</h2>
					<p className="text-sm text-muted-foreground">{instruction}</p>
					<ul className="flex flex-col gap-2">
						{lab.interactions.map((step) => (
							<li key={step.id} className="flex items-start gap-2 text-sm">
								<input
									id={`step-${step.id}`}
									type="checkbox"
									checked={Boolean(checked[step.id])}
									onChange={(event) => {
										const next = event.target.checked;
										setChecked((prev) => ({
											...prev,
											[step.id]: next,
										}));
										if (next) {
											setLastEvent(`Marked: ${step.label}`);
										}
									}}
									className="mt-1"
								/>
								<label htmlFor={`step-${step.id}`}>{step.label}</label>
							</li>
						))}
					</ul>
					{extraAction?.(api)}
				</section>

				<p
					className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm"
					role="status"
					aria-live="polite"
				>
					{lastEvent}
				</p>
			</div>
		</AdminShell>
	);
}

export function ProfileDropdownLabHost({ lab }: { lab: PlaygroundLab }) {
	return (
		<InteractionLabChrome
			lab={lab}
			instruction="Use the profile control in the AdminCN header (top-right). Opening the menu covers the first steps; Sign out records harness feedback below."
			headerSlots={({ mark, setLastEvent }) => ({
				profileSlot: (
					<ProfileDropdownSubject
						onSignOut={() => {
							mark("sign-out");
							setLastEvent("Sign out callback fired (local harness only).");
						}}
					/>
				),
			})}
			extraAction={({ mark, setLastEvent }) => (
				<button
					type="button"
					className="text-left text-sm text-primary underline-offset-4 hover:underline"
					onClick={() => {
						mark("open-menu");
						mark("read-identity");
						setLastEvent(
							"Marked open-menu + read-identity (confirm visually in the menu).",
						);
					}}
				>
					Mark open + identity steps after verifying the menu
				</button>
			)}
		/>
	);
}

export function NotificationDropdownLabHost({ lab }: { lab: PlaygroundLab }) {
	return (
		<InteractionLabChrome
			lab={lab}
			instruction="Use the bell control in the AdminCN header. Open the menu, switch Inbox/General, and confirm settings is reachable."
			headerSlots={() => ({
				notificationSlot: <NotificationDropdownSubject />,
			})}
		/>
	);
}

export function ActivityDialogLabHost({ lab }: { lab: PlaygroundLab }) {
	return (
		<InteractionLabChrome
			lab={lab}
			instruction="Use the activity control in the AdminCN header. Open the sheet, scan feed rows, then close and confirm focus returns."
			headerSlots={() => ({
				activitySlot: <ActivityDialogSubject />,
			})}
		/>
	);
}

const LAB_HOST_BY_ID = {
	"profile-dropdown": ProfileDropdownLabHost,
	"notification-dropdown": NotificationDropdownLabHost,
	"activity-dialog": ActivityDialogLabHost,
} as const;

/** Explicit host variants by lab id — no boolean mode tree. */
export function LabHost({ lab }: { lab: PlaygroundLab }) {
	const Host = LAB_HOST_BY_ID[lab.id as keyof typeof LAB_HOST_BY_ID];
	if (!Host) {
		return null;
	}
	return <Host lab={lab} />;
}
