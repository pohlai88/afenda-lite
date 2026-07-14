"use client";

import { SegmentError } from "@/features/auth/segment-error";

type OperatorErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function OperatorError({ error, reset }: OperatorErrorProps) {
	return (
		<SegmentError
			title="Operator surface unavailable"
			fallbackMessage="Something went wrong loading this operator surface."
			error={error}
			reset={reset}
		/>
	);
}
