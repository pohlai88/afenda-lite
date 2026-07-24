"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import { recordOwnAttendanceAction } from "@/app/actions/hr-self-service";
import type { HrTimeZone } from "@/features/human-resources/display-preferences";

export function AttendanceControl({ timeZone }: { timeZone: HrTimeZone }) {
	const [state, action, pending] = useActionState(
		recordOwnAttendanceAction,
		null,
	);

	return (
		<form action={action} aria-busy={pending} className="space-y-4">
			<input type="hidden" name="timeZone" value={timeZone} />
			{state?.ok ? (
				<Alert role="status">
					<AlertTitle>Attendance recorded</AlertTitle>
					<AlertDescription>
						The {state.data.eventType} event was recorded successfully.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false ? <FormError>{state.message}</FormError> : null}
			<div className="grid gap-3 sm:grid-cols-2">
				{[
					["clock-in", "Clock in"],
					["break-start", "Start break"],
					["break-end", "End break"],
					["clock-out", "Clock out"],
				].map(([value, label]) => (
					<Button
						key={value}
						type="submit"
						name="eventType"
						value={value}
						variant={value === "clock-in" ? "default" : "outline"}
						disabled={pending}
					>
						{pending ? <Spinner /> : null}
						{label}
					</Button>
				))}
			</div>
		</form>
	);
}
