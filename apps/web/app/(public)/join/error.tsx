"use client";

import { SegmentError } from "@/features/auth/segment-error";

interface JoinErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/** Panel-body error — cinematic chrome stays mounted in AuthIslandLayout. */
export default function JoinError({ error, reset }: JoinErrorProps) {
	return (
		<SegmentError
			asLandmark={false}
			error={error}
			fallbackMessage="The join surface failed to render. Try again from your invitation link."
			reset={reset}
			title="Join unavailable"
		/>
	);
}
