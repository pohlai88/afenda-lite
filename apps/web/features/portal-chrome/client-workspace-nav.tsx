import { authServer } from "@afenda/auth";
import Link from "next/link";

import { CLIENT_DASHBOARD_PATH } from "@/features/auth/client-paths";
import { resolveClientShellNav } from "@/features/portal-chrome/resolve-shell-access";

/**
 * Permission-gated client workspace module links (read consoles).
 */
export async function ClientWorkspaceNav() {
	const session = await authServer.session.get();
	const navItems = await resolveClientShellNav(session);

	return (
		<nav
			aria-label="Client modules"
			className="border-border border-b bg-surface-raised"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
				<Link
					className="font-semibold text-foreground text-sm tracking-tight"
					href={CLIENT_DASHBOARD_PATH}
				>
					Afenda-Lite
				</Link>
				{navItems.length === 0 ? (
					<span className="text-muted-foreground text-sm">
						No modules enabled for this account
					</span>
				) : (
					<ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
						{navItems.map((item) => (
							<li key={item.id}>
								<Link
									className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
									href={item.href}
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
