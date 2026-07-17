import { MAIN_CONTENT_HASH } from "@/features/auth/main-content";

/**
 * First-focus skip link — moves keyboard users past chrome into main.
 * Visually hidden until focused (WCAG 2.4.1 Bypass Blocks).
 */
export function SkipToMainContent() {
	return (
		<a
			href={MAIN_CONTENT_HASH}
			className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			Skip to main content
		</a>
	);
}
