"use client";

import { Button } from "@afenda/ui-system";

import { GLOBAL_ERROR_PUBLIC_MESSAGE } from "@/features/auth/safe-error-copy";

import "../globals.css";

export default function GlobalError({
	error: _error,
	reset,
}: {
	/** Kept for Next.js error-boundary contract; internal text is not shown. */
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en">
			<body>
				<main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas p-4">
					<h1 className="text-2xl font-semibold tracking-tight">
						Something went wrong
					</h1>
					<p className="max-w-md text-center text-sm text-foreground-secondary">
						{GLOBAL_ERROR_PUBLIC_MESSAGE}
					</p>
					<Button type="button" variant="outline" onClick={reset}>
						Try again
					</Button>
				</main>
			</body>
		</html>
	);
}
