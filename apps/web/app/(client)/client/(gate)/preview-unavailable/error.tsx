"use client";

import { SegmentError } from "@/features/auth/segment-error";

type ClientPreviewUnavailableErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function ClientPreviewUnavailableError({
	error,
	reset,
}: ClientPreviewUnavailableErrorProps) {
	return (
		<SegmentError
			title="Preview unavailable"
			fallbackMessage="Something went wrong loading this surface."
			error={error}
			reset={reset}
		/>
	);
}
