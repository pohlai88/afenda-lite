import { MAIN_CONTENT_HASH } from "@/features/auth/main-content";

/**
 * First-focus skip link — moves keyboard users past chrome into main.
 * Visually hidden until focused (WCAG 2.4.1 Bypass Blocks).
 */
export function SkipToMainContent() {
	return (
		<a
			className="sr-only bg-primary text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:font-medium focus:text-sm focus:shadow-(--shadow-overlay) focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			href={MAIN_CONTENT_HASH}
		>
			Skip to main content
		</a>
	);
}
