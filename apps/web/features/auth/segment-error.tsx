"use client";

import { Button } from "@afenda/ui-system";
import type { ElementType } from "react";

import { publicErrorCopy } from "@/features/auth/safe-error-copy";

interface SegmentErrorProps {
	/**
	 * When false, render a div so a parent layout can own the sole `<main>`
	 * (auth/join island under AuthIslandLayout).
	 */
	asLandmark?: boolean;
	/** Kept for Next.js error-boundary contract; internal text is not shown. */
	error: Error & { digest?: string };
	/** User-safe copy only — never render thrown Error text (GUIDE-017 · N12). */
	fallbackMessage: string;
	reset: () => void;
	title: string;
}

/** Shared client/auth segment error chrome — keep boundaries thin (DRY). */
export function SegmentError({
	title,
	fallbackMessage,
	error: _error,
	reset,
	asLandmark = true,
}: SegmentErrorProps) {
	const Root: ElementType = asLandmark ? "main" : "div";
	const className = asLandmark
		? "flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center"
		: "flex flex-col items-center justify-center gap-4 py-8 text-center";
	return (
		<Root className={className}>
			<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
			<p className="max-w-sm text-foreground-secondary text-sm">
				{publicErrorCopy(fallbackMessage)}
			</p>
			<Button onClick={reset} type="button" variant="outline">
				Retry
			</Button>
		</Root>
	);
}
