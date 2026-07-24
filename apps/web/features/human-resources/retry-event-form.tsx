"use client";

import { Button, FormError, Spinner } from "@afenda/ui-system";
import { useActionState } from "react";

import { retryFailedHrEventAction } from "@/app/actions/hr-operations";

export function RetryEventForm({ eventId }: { eventId: string }) {
	const [state, action, pending] = useActionState(
		retryFailedHrEventAction,
		null,
	);
	return (
		<form action={action} aria-busy={pending} className="space-y-2">
			<input type="hidden" name="eventId" value={eventId} />
			<input type="hidden" name="confirmation" value="RETRY_FAILED_HR_EVENT" />
			<Button type="submit" size="sm" variant="outline" disabled={pending}>
				{pending ? <Spinner /> : null}
				Retry
			</Button>
			{state?.ok === false ? <FormError>{state.message}</FormError> : null}
			{state?.ok ? (
				<p className="text-sm text-success" role="status">
					Queued for retry.
				</p>
			) : null}
		</form>
	);
}
