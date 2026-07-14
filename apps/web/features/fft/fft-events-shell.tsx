import { getSession } from "@afenda/auth";

import { listEvents } from "@/modules/fft/domain/list-events";

/**
 * Feed Farm Trade feature — session-aware RSC load + domain event list
 * (ARCH-013 · ARCH-028 S7.4). Read shape only; no 2B–2D reopen.
 * Never imports `@afenda/db`.
 */
export async function FftEventsShell() {
	const { orgId } = await getSession();
	const events = await listEvents(orgId);

	return (
		<main className="flex min-h-dvh flex-col gap-6 p-8">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Feed Farm Trade
				</h1>
				<p className="text-muted-foreground">
					Org-scoped events for <code className="text-foreground">{orgId}</code>
					.
				</p>
			</header>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="fft-events-heading"
			>
				<h2 id="fft-events-heading" className="text-lg font-medium">
					Events ({events.length})
				</h2>
				{events.length === 0 ? (
					<p className="text-sm text-muted-foreground">No events yet.</p>
				) : (
					<ul className="list-inside list-disc text-sm">
						{events.map((event) => (
							<li key={event.id}>
								{event.eventName}{" "}
								<code className="text-muted-foreground">{event.eventCode}</code>{" "}
								· {event.status}
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
