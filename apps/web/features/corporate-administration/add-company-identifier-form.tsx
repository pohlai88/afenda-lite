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
	type AddCompanyIdentifierActionState,
	addCompanyIdentifierAction,
} from "@/app/actions/add-company-identifier";

type AddCompanyIdentifierFormProps = {
	legalCompanyId: string;
};

export function AddCompanyIdentifierForm({
	legalCompanyId,
}: AddCompanyIdentifierFormProps) {
	const [state, action, pending] = useActionState<
		AddCompanyIdentifierActionState,
		FormData
	>(addCompanyIdentifierAction, null);

	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<div className="grid gap-2">
				<Label htmlFor="identifierType">Identifier type</Label>
				<Input
					id="identifierType"
					name="identifierType"
					required
					maxLength={100}
					placeholder="company_registration"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="identifierValue">Identifier value</Label>
				<Input
					id="identifierValue"
					name="identifierValue"
					required
					maxLength={500}
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="jurisdictionCountryId">
					Jurisdiction country id (optional)
				</Label>
				<Input
					id="jurisdictionCountryId"
					name="jurisdictionCountryId"
					placeholder="uuid"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="authorityPartyId">Authority party id (optional)</Label>
				<Input
					id="authorityPartyId"
					name="authorityPartyId"
					placeholder="uuid"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="effectiveFrom">Effective from</Label>
				<Input id="effectiveFrom" name="effectiveFrom" type="date" required />
			</div>
			{state && !state.ok ? (
				<Alert variant="destructive">
					<AlertTitle>Could not add identifier</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}
			{state?.ok ? (
				<Alert>
					<AlertTitle>Identifier added</AlertTitle>
					<AlertDescription>
						{state.data.identifier.identifierValue}
					</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending}>
				{pending ? "Adding…" : "Add company identifier"}
			</Button>
		</form>
	);
}
