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
	type AddCompanyNameActionState,
	addCompanyNameAction,
} from "@/app/actions/add-company-name";

type AddCompanyNameFormProps = {
	legalCompanyId: string;
};

export function AddCompanyNameForm({
	legalCompanyId,
}: AddCompanyNameFormProps) {
	const [state, action, pending] = useActionState<
		AddCompanyNameActionState,
		FormData
	>(addCompanyNameAction, null);

	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="legalCompanyId" value={legalCompanyId} />
			<div className="grid gap-2">
				<Label htmlFor="nameType">Name type</Label>
				<select
					id="nameType"
					name="nameType"
					required
					className="h-9 rounded-md border bg-background px-3 text-sm"
					defaultValue="legal"
				>
					<option value="legal">Legal</option>
					<option value="former">Former</option>
					<option value="trading">Trading</option>
				</select>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="displayName">Display name</Label>
				<Input id="displayName" name="displayName" required maxLength={300} />
			</div>
			<div className="grid gap-2">
				<Label htmlFor="effectiveFrom">Effective from</Label>
				<Input id="effectiveFrom" name="effectiveFrom" type="date" required />
			</div>
			{state && !state.ok ? (
				<Alert variant="destructive">
					<AlertTitle>Could not add name</AlertTitle>
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			) : null}
			{state?.ok ? (
				<Alert>
					<AlertTitle>Name added</AlertTitle>
					<AlertDescription>{state.data.name.displayName}</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending}>
				{pending ? "Adding…" : "Add company name"}
			</Button>
		</form>
	);
}
