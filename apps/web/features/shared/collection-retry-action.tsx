"use client";

import { Button } from "@afenda/ui-system";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface CollectionRetryActionProps {
	label: string;
}

export function CollectionRetryAction({ label }: CollectionRetryActionProps) {
	const router = useRouter();
	const handleRetry = useCallback(() => router.refresh(), [router]);

	return (
		<Button onClick={handleRetry} size="sm" variant="outline">
			{label}
		</Button>
	);
}
