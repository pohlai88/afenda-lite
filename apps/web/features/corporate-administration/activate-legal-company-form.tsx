"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Input,
	Label,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type ActivateLegalCompanyActionState,
	activateLegalCompanyAction,
} from "@/app/actions/activate-legal-company";

type ActivateLegalCompanyFormProps = {
	legalCompanyId: string;
	expectedVersion: number;
};

export function ActivateLegalCompanyForm({
	legalCompanyId,
	expectedVersion,
}: ActivateLegalCompanyFormProps) {
	const [state, action, pending] = useActionState<
		ActivateLegalCompanyActionState,
		FormData
	>(activateLegalCompanyAction, null);

	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<input type="hidden" name="expectedVersion" value={expectedVersion} />
			<div className="grid gap-2">
				<Label htmlFor="effectiveDate">Effective date</Label>
				<Input id="effectiveDate" name="effectiveDate" type="date" required />
			</div>
			{state && !state.ok ? (
				<Alert variant="destructive">
					<AlertTitle>Could not activate</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}
			{state?.ok ? (
				<Alert>
					<AlertTitle>Company activated</AlertTitle>
					<AlertDescription>{state.data.company.status}</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending}>
				{pending ? "Activating…" : "Activate company"}
			</Button>
		</form>
	);
}
