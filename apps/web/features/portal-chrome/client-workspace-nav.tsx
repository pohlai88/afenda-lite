import { getSession } from "@afenda/auth";
import Link from "next/link";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";
import { resolveClientShellNav } from "@/features/portal-chrome/resolve-shell-access";

/**
 * Permission-gated client workspace module links (read consoles).
 */
export async function ClientWorkspaceNav() {
	const session = await getSession();
	const navItems = await resolveClientShellNav(session);

	return (
		<nav
			aria-label="Client modules"
			className="border-b border-border bg-surface-raised"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
				<Link
					href={CLIENT_DASHBOARD_PATH}
					className="text-sm font-semibold tracking-tight text-foreground"
				>
					Afenda-Lite
				</Link>
				{navItems.length === 0 ? (
					<span className="text-sm text-muted-foreground">
						No modules enabled for this account
					</span>
				) : (
					<ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
						{navItems.map((item) => (
							<li key={item.id}>
								<Link
									href={item.href}
									className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</nav>
	);
}
