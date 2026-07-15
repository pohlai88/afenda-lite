"use client";

import { PlaygroundHarnessChrome } from "@/features/playground/harness-chrome";
import { useCompose } from "@/features/playground/compose/compose-context";
import {
	STAGE_COLOR_MODES,
	STAGE_VIEWPORTS,
	viewportClassName,
} from "@/features/playground/compose/stage-types";
import {
	resolveHeaderSlots,
	StageMainSubject,
} from "@/features/playground/lab-subjects";

export function ComposeStage() {
	const {
		state: { stage },
		actions: { addLab, setViewport, setSidebarOpen, setColorMode, setStatus },
	} = useCompose();

	const headerSlots = resolveHeaderSlots(stage.items, {
		onProfileSignOut: () =>
			setStatus("Header profile sign-out callback fired."),
	});

	const shellKey = [
		stage.inspector.sidebarOpen ? "sidebar-open" : "sidebar-closed",
		stage.inspector.mode,
		stage.items.map((item) => item.labId).join("|"),
	].join(":");

	return (
		<section
			className="flex flex-col gap-4 p-4"
			aria-label="Live stage"
			onDragOver={(event) => event.preventDefault()}
			onDrop={(event) => {
				event.preventDefault();
				const labId = event.dataTransfer.getData("text/lab-id");
				if (labId) addLab(labId);
			}}
		>
			<div className="flex flex-wrap items-end gap-3">
				<label className="flex flex-col gap-1 text-xs">
					<span className="font-medium">Viewport</span>
					<select
						className="h-9 rounded-md border bg-background px-2"
						value={stage.inspector.viewport}
						onChange={(event) =>
							setViewport(
								event.target.value as (typeof STAGE_VIEWPORTS)[number],
							)
						}
					>
						{STAGE_VIEWPORTS.map((viewport) => (
							<option key={viewport} value={viewport}>
								{viewport[0]?.toUpperCase()}
								{viewport.slice(1)}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-xs">
					<span className="font-medium">Color mode</span>
					<select
						className="h-9 rounded-md border bg-background px-2"
						value={stage.inspector.mode}
						onChange={(event) =>
							setColorMode(
								event.target.value as (typeof STAGE_COLOR_MODES)[number],
							)
						}
					>
						{STAGE_COLOR_MODES.map((mode) => (
							<option key={mode} value={mode}>
								{mode[0]?.toUpperCase()}
								{mode.slice(1)}
							</option>
						))}
					</select>
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={stage.inspector.sidebarOpen}
						onChange={(event) => setSidebarOpen(event.target.checked)}
					/>
					Sidebar open
				</label>
			</div>

			<div
				className={`mx-auto w-full ${viewportClassName(stage.inspector.viewport)}`}
			>
				{stage.items.length === 0 ? (
					<div
						className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-8 text-center"
						role="status"
					>
						<p className="font-medium">Empty stage</p>
						<p className="text-sm text-muted-foreground">
							Add a ready lab from the left palette.
						</p>
					</div>
				) : (
					<PlaygroundHarnessChrome
						key={shellKey}
						defaultSidebarOpen={stage.inspector.sidebarOpen}
						profileSlot={headerSlots.profileSlot}
						notificationSlot={headerSlots.notificationSlot}
						activitySlot={headerSlots.activitySlot}
					>
						<div className="flex flex-col gap-4">
							{stage.items.map((item) => (
								<StageMainSubject
									key={item.instanceId}
									item={item}
									callbacks={{
										onProfileSignOut: () =>
											setStatus(`Sign-out from ${item.labId} on stage.`),
									}}
								/>
							))}
						</div>
					</PlaygroundHarnessChrome>
				)}
			</div>
		</section>
	);
}
