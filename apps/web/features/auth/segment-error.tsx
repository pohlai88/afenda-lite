"use client";

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
		<main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
			<p className="max-w-sm text-sm text-muted-foreground">
				{error.message || fallbackMessage}
			</p>
			<button
				type="button"
				className="rounded-md border border-border bg-background px-4 py-2 text-sm"
				onClick={reset}
			>
				Retry
			</button>
		</main>
	);
}
