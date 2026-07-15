"use client";

import type { ReactNode } from "react";

/**
 * Playground-only chrome that mounts design-system shared header controls.
 * Does not invent AdminShell inside the package — adopts layout via slots.
 */
export function PlaygroundHarnessChrome({
	defaultSidebarOpen: _defaultSidebarOpen = false,
	profileSlot,
	notificationSlot,
	activitySlot,
	children,
}: {
	defaultSidebarOpen?: boolean;
	profileSlot?: ReactNode;
	notificationSlot?: ReactNode;
	activitySlot?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="bg-background flex min-h-full flex-col">
			<header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-card px-4 py-3">
				<p className="text-sm font-medium tracking-tight">Playground harness</p>
				<div className="flex items-center gap-1.5">
					{activitySlot}
					{notificationSlot}
					{profileSlot}
				</div>
			</header>
			<main className="flex-1 p-4 sm:p-6">{children}</main>
		</div>
	);
}
