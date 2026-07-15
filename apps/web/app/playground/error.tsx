"use client";

export default function PlaygroundError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6 py-10">
			<h1 className="text-xl font-semibold tracking-tight">Playground error</h1>
			<p className="text-sm text-muted-foreground">
				{error.message || "Something went wrong in the local harness."}
			</p>
			{error.digest ? (
				<p className="font-mono text-xs text-muted-foreground">
					digest {error.digest}
				</p>
			) : null}
			<button
				type="button"
				className="inline-flex h-9 w-fit items-center rounded-md border bg-background px-4 text-sm hover:bg-muted"
				onClick={reset}
			>
				Try again
			</button>
		</main>
	);
}
