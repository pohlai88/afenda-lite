"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function readCookie(key: string): string | null {
	if (typeof document === "undefined") {
		return null;
	}

	const encoded = encodeURIComponent(key);
	const match = document.cookie.match(new RegExp(`(?:^|; )${encoded}=([^;]*)`));

	if (!match?.[1]) {
		return null;
	}

	return decodeURIComponent(match[1]);
}

function writeCookie(key: string, value: string, maxAgeDays = 365) {
	if (typeof document === "undefined") {
		return;
	}

	const maxAge = maxAgeDays * 24 * 60 * 60;
	document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * JSON cookie read/write — promotes archive `use-object-cookie` without `react-use`.
 */
export function useObjectCookie<T>(
	key: string,
	fallback?: T | null,
): [T, (newVal: T) => void] {
	const [valStr, setValStr] = useState<string | null>(() => readCookie(key));

	useEffect(() => {
		setValStr(readCookie(key));
	}, [key]);

	const value = useMemo<T>(() => {
		if (valStr) {
			try {
				return JSON.parse(valStr) as T;
			} catch {
				return fallback as T;
			}
		}

		return fallback as T;
	}, [valStr, fallback]);

	const updateValue = useCallback(
		(newVal: T) => {
			const next = JSON.stringify(newVal);
			writeCookie(key, next);
			setValStr(next);
		},
		[key],
	);

	return [value, updateValue];
}
