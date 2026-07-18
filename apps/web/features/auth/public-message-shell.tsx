import type { ElementType, ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";

type PublicMessageShellProps = {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	/**
	 * When false, render a div so a parent layout can own the sole `<main>`
	 * (join island under AuthIslandLayout).
	 */
	asLandmark?: boolean;
};

/**
 * Shared blank-chrome message shell for gate / 403 / workspace not-found (DRY · KISS).
 */
export function PublicMessageShell({
	title,
	children,
	footer,
	asLandmark = true,
}: PublicMessageShellProps) {
	const Root: ElementType = asLandmark ? "main" : "div";
	return (
		<Root
			{...(asLandmark ? { id: MAIN_CONTENT_ID, tabIndex: -1 as const } : {})}
			className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center"
		>
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<div className="max-w-md text-sm text-foreground-secondary">
				{children}
			</div>
			{footer}
		</Root>
	);
}
