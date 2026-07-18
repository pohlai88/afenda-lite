"use client";

import { SegmentError } from "@/features/auth/segment-error";

type JoinErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

/** Panel-body error — cinematic chrome stays mounted in AuthIslandLayout. */
export default function JoinError({ error, reset }: JoinErrorProps) {
	return (
		<SegmentError
			asLandmark={false}
			title="Join unavailable"
			fallbackMessage="The join surface failed to render. Try again from your invitation link."
			error={error}
			reset={reset}
		/>
	);
}
