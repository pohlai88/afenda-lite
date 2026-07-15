"use client";

import { useEffect, useState } from "react";

/** AdminCN shell breakpoint (archive `use-mobile` — xl / sidebar collapse). */
const MOBILE_BREAKPOINT = 1280;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
	const [isMobile, setIsMobile] = useState<boolean | undefined>(() => {
		if (typeof window === "undefined") {
			return undefined;
		}

		return window.innerWidth < breakpoint;
	});

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

		const onChange = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		onChange();
		mql.addEventListener("change", onChange);

		return () => mql.removeEventListener("change", onChange);
	}, [breakpoint]);

	return !!isMobile;
}
