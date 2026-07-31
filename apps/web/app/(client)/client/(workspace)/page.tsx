import { authServer } from "@afenda/auth";
import Link from "next/link";

import { TheMachineChat } from "@/features/ai-the-machine/the-machine-chat";
import { resolveClientShellNav } from "@/features/portal-chrome/resolve-shell-access";

/**
 * Client workspace home — enabled modules + The Machine chat.
 */
export default async function ClientWorkspaceHomePage() {
	const session = await authServer.session.get();
	const modules = await resolveClientShellNav(session);

	return (
		<section className="flex min-h-dvh flex-col items-center gap-10 px-6 py-16">
			<div className="space-y-3 text-center">
				<p className="font-semibold text-2xl text-foreground tracking-tight">
					Afenda-Lite
				</p>
				<h1 className="max-w-md font-medium text-foreground text-lg">
					{modules.length > 0 ? "Workspace modules" : "No modules available"}
				</h1>
				<p className="max-w-sm text-muted-foreground text-sm">
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
								className="block rounded-md border border-border bg-surface-raised px-4 py-3 font-medium text-foreground text-sm underline-offset-4 hover:underline"
								href={item.href}
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
