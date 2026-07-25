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
	type CreateLegalCompanyActionState,
	createLegalCompanyAction,
} from "@/app/actions/create-legal-company";

type CreateLegalCompanyFormProps = {
	defaultLegalPartyId?: string;
};

export function CreateLegalCompanyForm({
	defaultLegalPartyId,
}: CreateLegalCompanyFormProps) {
	const [state, action, pending] = useActionState<
		CreateLegalCompanyActionState,
		FormData
	>(createLegalCompanyAction, null);

	return (
		<form action={action} className="flex flex-col gap-3">
			<div className="grid gap-2">
				<Label htmlFor="code">Company code</Label>
				<Input id="code" name="code" required maxLength={64} />
			</div>
			<div className="grid gap-2">
				<Label htmlFor="legalEntityDimensionId">
					Legal entity dimension ID
				</Label>
				<Input
					id="legalEntityDimensionId"
					name="legalEntityDimensionId"
					required
					placeholder="UUID of md_organization_dimension (legal_entity)"
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="legalPartyId">Organization party ID (optional)</Label>
				<Input
					id="legalPartyId"
					name="legalPartyId"
					defaultValue={defaultLegalPartyId}
					placeholder="UUID of md_party (organization)"
				/>
			</div>
			{state && !state.ok ? (
				<Alert variant="destructive">
					<AlertTitle>Could not create company</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}
			{state?.ok ? (
				<Alert>
					<AlertTitle>Company created</AlertTitle>
					<AlertDescription>
						{state.data.company.code} · {state.data.company.status}
					</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending}>
				{pending ? "Creating…" : "Create draft company"}
			</Button>
		</form>
	);
}
