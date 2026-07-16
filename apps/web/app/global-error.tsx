"use client";

import { Button } from "@afenda/ui-system";

import "../globals.css";

export default function GlobalError({
	error,
	reset,
}: {
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
						{error.message || "Unexpected application error."}
					</p>
					<Button type="button" variant="outline" onClick={reset}>
						Try again
					</Button>
				</main>
			</body>
		</html>
	);
}
