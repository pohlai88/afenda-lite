"use client";

import { Button } from "@afenda/ui-system";

import { publicErrorCopy } from "@/features/auth/safe-error-copy";

type SegmentErrorProps = {
	title: string;
	/** User-safe copy only — never render thrown Error text (GUIDE-017 · N12). */
	fallbackMessage: string;
	/** Kept for Next.js error-boundary contract; internal text is not shown. */
	error: Error & { digest?: string };
	reset: () => void;
};

/** Shared client/auth segment error chrome — keep boundaries thin (DRY). */
export function SegmentError({
	title,
	fallbackMessage,
	error: _error,
	reset,
}: SegmentErrorProps) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<p className="max-w-sm text-sm text-foreground-secondary">
				{publicErrorCopy(fallbackMessage)}
			</p>
			<Button type="button" variant="outline" onClick={reset}>
				Retry
			</Button>
		</main>
	);
}
