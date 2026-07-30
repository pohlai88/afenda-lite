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
			<input name="eventId" type="hidden" value={eventId} />
			<input name="confirmation" type="hidden" value="RETRY_FAILED_HR_EVENT" />
			<Button disabled={pending} size="sm" type="submit" variant="outline">
				{pending ? <Spinner /> : null}
				Retry
			</Button>
			{state?.ok === false ? <FormError>{state.message}</FormError> : null}
			{state?.ok ? (
				<p
					className="font-bold text-sm text-success-subtle-foreground"
					role="status"
				>
					Queued for retry.
				</p>
			) : null}
		</form>
	);
}
