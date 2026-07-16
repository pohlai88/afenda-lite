import { getSession } from "@afenda/auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";

import { FftEventsPanel } from "@/features/fft/fft-events-panel";
import { listEvents } from "@/modules/fft/domain/list-events";

/**
 * Feed Farm Trade feature — session-aware RSC load + domain event list
 * (ARCH-013 · ARCH-028 S7.4). Read shape only; no 2B–2D reopen.
 * Never imports `@afenda/db`. UI from `@afenda/ui-system` (ADR-010).
 */
export async function FftEventsShell() {
	const { orgId } = await getSession();
	const events = await listEvents(orgId);

	return (
		<main className="flex min-h-dvh flex-col gap-6 bg-canvas p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Feed Farm Trade
				</h1>
				<p className="text-sm text-foreground-secondary">
					Org-scoped events for{" "}
					<code className="font-mono text-foreground">{orgId}</code>.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Events</CardTitle>
					<CardDescription>
						Domain event list for this organization ({events.length}).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FftEventsPanel
						events={events.map((event) => ({
							id: event.id,
							eventName: event.eventName,
							eventCode: event.eventCode,
							status: event.status,
						}))}
					/>
				</CardContent>
			</Card>
		</main>
	);
}
