import type { ReactNode } from "react";

type PublicMessageShellProps = {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
};

/**
 * Shared blank-chrome message shell for gate / 403 / workspace not-found (DRY · KISS).
 */
export function PublicMessageShell({
	title,
	children,
	footer,
}: PublicMessageShellProps) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<div className="max-w-md text-sm text-foreground-secondary">{children}</div>
			{footer}
		</main>
	);
}
