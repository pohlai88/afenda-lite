"use client";

import { SegmentError } from "@/features/auth/segment-error";

type JoinErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function JoinError({ error, reset }: JoinErrorProps) {
	return (
		<div className="auth-surface">
			<SegmentError
				asLandmark={false}
				title="Join unavailable"
				fallbackMessage="The join surface failed to render. Try again from your invitation link."
				error={error}
				reset={reset}
			/>
		</div>
	);
}
