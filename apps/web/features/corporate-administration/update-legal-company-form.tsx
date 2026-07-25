"use client";

import type { CaLegalCompany } from "@afenda/corporate-administration";
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
	type UpdateLegalCompanyActionState,
	updateLegalCompanyAction,
} from "@/app/actions/update-legal-company";

export function UpdateLegalCompanyForm({
	company,
}: {
	company: CaLegalCompany;
}) {
	const [state, action, pending] = useActionState<
		UpdateLegalCompanyActionState,
		FormData
	>(updateLegalCompanyAction, null);

	return (
		<form action={action} className="grid gap-4 md:grid-cols-2">
			<input type="hidden" name="legalCompanyId" value={company.id} />
			<input type="hidden" name="expectedVersion" value={company.version} />
			<div className="grid gap-2">
				<Label htmlFor={`legal-form-${company.id}`}>Legal form</Label>
				<Input
					id={`legal-form-${company.id}`}
					name="legalFormCode"
					defaultValue={company.legalFormCode ?? ""}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor={`incorporation-date-${company.id}`}>
					Incorporation date
				</Label>
				<Input
					id={`incorporation-date-${company.id}`}
					name="incorporationDate"
					type="date"
					defaultValue={company.incorporationDate ?? ""}
				/>
			</div>
			{state && !state.ok ? (
				<Alert variant="destructive" className="md:col-span-2">
					<AlertTitle>Could not update company</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}
			{state?.ok ? (
				<Alert className="md:col-span-2">
					<AlertTitle>Company updated</AlertTitle>
					<AlertDescription>
						Saved as version {state.data.company.version}.
					</AlertDescription>
				</Alert>
			) : null}
			<div className="md:col-span-2">
				<Button type="submit" disabled={pending}>
					{pending ? "Saving…" : "Save company profile"}
				</Button>
			</div>
		</form>
	);
}
