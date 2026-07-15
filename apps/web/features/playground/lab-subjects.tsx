"use client";

import { Button } from "@afenda/ui/components/button";
import ActivityDialog from "@afenda/ui/composite/activity-dialog";
import NotificationDropdown from "@afenda/ui/composite/notification-dropdown";
import ProfileDropdown from "@afenda/ui/composite/profile-dropdown";
import { ActivityIcon, BellIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { StageItem } from "@/features/playground/compose/stage-types";
import { PROFILE_DROPDOWN_FIXTURE } from "@/features/playground/fixtures/profile-dropdown";
import {
	getLabById,
	type PlaygroundLab,
} from "@/features/playground/lab-registry";

export type LabHarnessCallbacks = {
	onProfileSignOut?: () => void;
};

function NotificationTrigger() {
	return (
		<Button variant="ghost" size="icon" className="relative">
			<BellIcon />
			<span className="bg-destructive absolute top-2 right-2.5 size-2 rounded-full" />
		</Button>
	);
}

function ActivityTrigger() {
	return (
		<Button variant="ghost" size="icon">
			<ActivityIcon />
		</Button>
	);
}

export function ProfileDropdownSubject({
	onSignOut,
}: {
	onSignOut?: () => void;
}) {
	return (
		<ProfileDropdown
			user={PROFILE_DROPDOWN_FIXTURE.user}
			items={[...PROFILE_DROPDOWN_FIXTURE.items]}
			signOutLabel={PROFILE_DROPDOWN_FIXTURE.signOutLabel}
			onSignOut={onSignOut}
		/>
	);
}

export function NotificationDropdownSubject() {
	return <NotificationDropdown trigger={<NotificationTrigger />} />;
}

export function ActivityDialogSubject() {
	return (
		<ActivityDialog
			trigger={<ActivityTrigger />}
			triggerClassName="max-md:hidden"
		/>
	);
}

/** Explicit mount variants — no boolean mode tree. */
export function HeaderLabSubject({
	labId,
	callbacks,
}: {
	labId: string;
	callbacks?: LabHarnessCallbacks;
}): ReactNode {
	switch (labId) {
		case "profile-dropdown":
			return <ProfileDropdownSubject onSignOut={callbacks?.onProfileSignOut} />;
		case "notification-dropdown":
			return <NotificationDropdownSubject />;
		case "activity-dialog":
			return <ActivityDialogSubject />;
		default:
			return null;
	}
}

export function resolveHeaderSlots(
	items: readonly StageItem[],
	callbacks?: LabHarnessCallbacks,
): {
	profileSlot?: ReactNode;
	notificationSlot?: ReactNode;
	activitySlot?: ReactNode;
} {
	let profileLab: PlaygroundLab | undefined;
	let notificationLab: PlaygroundLab | undefined;
	let activityLab: PlaygroundLab | undefined;

	for (const item of items) {
		const lab = getLabById(item.labId);
		if (lab?.mount !== "header") continue;
		if (lab.id === "profile-dropdown") profileLab = lab;
		if (lab.id === "notification-dropdown") notificationLab = lab;
		if (lab.id === "activity-dialog") activityLab = lab;
	}

	return {
		profileSlot: profileLab ? (
			<ProfileDropdownSubject onSignOut={callbacks?.onProfileSignOut} />
		) : undefined,
		notificationSlot: notificationLab ? (
			<NotificationDropdownSubject />
		) : undefined,
		activitySlot: activityLab ? <ActivityDialogSubject /> : undefined,
	};
}

export function StageMainSubject({
	item,
	callbacks,
}: {
	item: StageItem;
	callbacks?: LabHarnessCallbacks;
}) {
	const lab = getLabById(item.labId);
	if (!lab) {
		return (
			<p className="text-sm text-muted-foreground">Unknown lab: {item.labId}</p>
		);
	}

	const subject = HeaderLabSubject({ labId: lab.id, callbacks });
	if (subject == null) {
		return (
			<p className="text-sm text-muted-foreground">No mount for {lab.id}</p>
		);
	}

	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
			<p className="text-sm font-medium">{lab.title}</p>
			<p className="text-xs text-muted-foreground">
				{lab.mount === "header"
					? "Also mirrored in the AdminShell header when this lab is on stage."
					: lab.description}
			</p>
			<div className="flex justify-end">{subject}</div>
		</div>
	);
}
