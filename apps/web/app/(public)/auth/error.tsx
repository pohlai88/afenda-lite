"use client";

import { SegmentError } from "@/features/auth/segment-error";

type AuthErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function AuthError({ error, reset }: AuthErrorProps) {
	return (
		<div className="auth-surface">
			<SegmentError
				asLandmark={false}
				title="Sign-in unavailable"
				fallbackMessage="The auth surface failed to render. Try again."
				error={error}
				reset={reset}
			/>
		</div>
	);
}
