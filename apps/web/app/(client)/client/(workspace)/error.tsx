"use client";

import { SegmentError } from "@/features/auth/segment-error";

interface ClientWorkspaceErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ClientWorkspaceError({
	error,
	reset,
}: ClientWorkspaceErrorProps) {
	return (
		<SegmentError
			asLandmark={false}
			error={error}
			fallbackMessage="Something went wrong loading this surface."
			reset={reset}
			title="Client workspace unavailable"
		/>
	);
}
