"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

/** Must match `auth-surface-cinematic-cycle` / reduced-dissolve duration in auth-surface.css. */
export const AUTH_SURFACE_CYCLE_MS = 25_000;

const PAUSED_CLASS = "auth-surface--paused";

type AuthSurfaceRootProps = {
	children: ReactNode;
};

/**
 * Persistent cinematic root — wall-clock `animation-delay` so remounts
 * (hard nav / HMR) rejoin the same ice↔fire phase instead of restarting at ice.
 * Pauses the cycle while the document is hidden (login-command performance).
 * Layout-owned chrome avoids remount on `/auth/*` path changes.
 */
export function AuthSurfaceRoot({ children }: AuthSurfaceRootProps) {
	const rootRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) {
			return;
		}
		el.style.animationDelay = `-${Date.now() % AUTH_SURFACE_CYCLE_MS}ms`;

		const syncVisibility = () => {
			el.classList.toggle(PAUSED_CLASS, document.hidden);
		};
		syncVisibility();
		document.addEventListener("visibilitychange", syncVisibility);
		return () => {
			document.removeEventListener("visibilitychange", syncVisibility);
		};
	}, []);

	return (
		<div
			ref={rootRef}
			className="auth-surface dark relative grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,24rem)]"
			suppressHydrationWarning
		>
			{children}
		</div>
	);
}
