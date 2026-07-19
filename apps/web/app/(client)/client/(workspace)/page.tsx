import { TheMachineChat } from "@/features/ai-the-machine/the-machine-chat";

/**
 * Client workspace home — The Machine chat while domain modules are unmounted.
 */
export default function ClientWorkspaceHomePage() {
	return (
		<section className="flex min-h-dvh flex-col items-center gap-10 bg-gradient-to-b from-background via-background to-muted/40 px-6 py-16">
			<div className="space-y-3 text-center">
				<p className="text-2xl font-semibold tracking-tight text-foreground">
					Afenda-Lite
				</p>
				<h1 className="max-w-md text-lg font-medium text-foreground">
					No modules available
				</h1>
				<p className="max-w-sm text-sm text-muted-foreground">
					Your account is signed in. Product modules will appear here when they
					are enabled for your organization.
				</p>
			</div>
			<TheMachineChat />
		</section>
	);
}
