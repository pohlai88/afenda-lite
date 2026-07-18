import type { ElementType, ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";

type PublicMessageShellProps = {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	/**
	 * When false, render a div so a parent layout can own the sole `<main>`
	 * (join island under AuthIslandLayout). Also drops blank-chrome page plane
	 * so content fills the auth-surface panel body like Path A forms.
	 */
	asLandmark?: boolean;
};

/**
 * Shared message shell for gate / 403 / workspace not-found / join missing.
 * Blank chrome (`asLandmark`) = full-page canvas center.
 * Island embed (`asLandmark={false}`) = panel body only — no nested bg-canvas.
 */
export function PublicMessageShell({
	title,
	children,
	footer,
	asLandmark = true,
}: PublicMessageShellProps) {
	const Root: ElementType = asLandmark ? "main" : "div";
	const rootClassName = asLandmark
		? "flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center"
		: "flex w-full flex-col gap-(--field-gap)";
	const bodyClassName = asLandmark
		? "max-w-md text-sm text-foreground-secondary"
		: "text-sm text-foreground-secondary";

	return (
		<Root
			{...(asLandmark ? { id: MAIN_CONTENT_ID, tabIndex: -1 as const } : {})}
			className={rootClassName}
		>
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			</div>
			<div className={bodyClassName}>{children}</div>
			{footer}
		</Root>
	);
}
