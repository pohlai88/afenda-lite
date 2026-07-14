"use client";

import { SegmentError } from "@/features/auth/segment-error";

type ClientWorkspaceErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function ClientWorkspaceError({
	error,
	reset,
}: ClientWorkspaceErrorProps) {
	return (
		<SegmentError
			title="Client workspace unavailable"
			fallbackMessage="Something went wrong loading this surface."
			error={error}
			reset={reset}
		/>
	);
}
