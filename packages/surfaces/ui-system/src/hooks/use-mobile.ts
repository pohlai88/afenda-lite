import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Viewport breakpoint for Sidebar Sheet vs desktop rail.
 *
 * WHY deferred (state + effect), not live `useSyncExternalStore`:
 * SSR and the first client paint both resolve to `false`, so React hydration
 * matches. Reading `matchMedia` / `innerWidth` during hydrate would diverge on
 * mobile viewports and warn. Progressive enhance after mount is intentional.
 */
export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
		undefined,
	);

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return !!isMobile;
}
