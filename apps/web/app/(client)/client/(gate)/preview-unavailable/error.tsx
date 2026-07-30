"use client";

import { SegmentError } from "@/features/auth/segment-error";

interface ClientPreviewUnavailableErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ClientPreviewUnavailableError({
	error,
	reset,
}: ClientPreviewUnavailableErrorProps) {
	return (
		<SegmentError
			error={error}
			fallbackMessage="Something went wrong loading this surface."
			reset={reset}
			title="Preview unavailable"
		/>
	);
}
