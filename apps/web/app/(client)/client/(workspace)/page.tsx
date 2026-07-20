import { getSession } from "@afenda/auth";
import Link from "next/link";

import { TheMachineChat } from "@/features/ai-the-machine/the-machine-chat";
import { resolveClientShellNav } from "@/features/portal-chrome/resolve-shell-access";

/**
 * Client workspace home — enabled modules + The Machine chat.
 */
export default async function ClientWorkspaceHomePage() {
	const session = await getSession();
	const modules = await resolveClientShellNav(session);

	return (
		<section className="flex min-h-dvh flex-col items-center gap-10 bg-gradient-to-b from-background via-background to-muted/40 px-6 py-16">
			<div className="space-y-3 text-center">
				<p className="text-2xl font-semibold tracking-tight text-foreground">
					Afenda-Lite
				</p>
				<h1 className="max-w-md text-lg font-medium text-foreground">
					{modules.length > 0 ? "Workspace modules" : "No modules available"}
				</h1>
				<p className="max-w-sm text-sm text-muted-foreground">
					{modules.length > 0
						? "Open a module you are permitted to use in this organization."
						: "Your account is signed in. Product modules appear here when they are enabled for your organization."}
				</p>
			</div>
			{modules.length > 0 ? (
				<ul className="flex w-full max-w-md flex-col gap-2 text-left">
					{modules.map((item) => (
						<li key={item.id}>
							<Link
								href={item.href}
								className="block rounded-md border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground underline-offset-4 hover:underline"
							>
								{item.label}
							</Link>
						</li>
					))}
				</ul>
			) : null}
			<TheMachineChat />
		</section>
	);
}
