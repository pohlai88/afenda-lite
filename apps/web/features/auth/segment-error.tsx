"use client";

import { Button } from "@afenda/ui-system";

type SegmentErrorProps = {
	title: string;
	fallbackMessage: string;
	error: Error & { digest?: string };
	reset: () => void;
};

/** Shared client/auth segment error chrome — keep boundaries thin (DRY). */
export function SegmentError({
	title,
	fallbackMessage,
	error,
	reset,
}: SegmentErrorProps) {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4 text-center">
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<p className="max-w-sm text-sm text-foreground-secondary">
				{error.message || fallbackMessage}
			</p>
			<Button type="button" variant="outline" onClick={reset}>
				Retry
			</Button>
		</main>
	);
}
