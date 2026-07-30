"use client";

import { SegmentError } from "@/features/auth/segment-error";

interface AuthErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/** Panel-body error — cinematic chrome stays mounted in AuthIslandLayout. */
export default function AuthError({ error, reset }: AuthErrorProps) {
	return (
		<SegmentError
			asLandmark={false}
			error={error}
			fallbackMessage="The auth surface failed to render. Try again."
			reset={reset}
			title="Sign-in unavailable"
		/>
	);
}
