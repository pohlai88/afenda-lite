"use client";

import { SegmentError } from "@/features/auth/segment-error";

interface OperatorErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function OperatorError({ error, reset }: OperatorErrorProps) {
	return (
		<SegmentError
			asLandmark={false}
			error={error}
			fallbackMessage="Something went wrong loading this operator surface."
			reset={reset}
			title="Operator surface unavailable"
		/>
	);
}
