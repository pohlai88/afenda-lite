"use client";

import { TAX_REGISTRATION_TYPES } from "@afenda/master-data/types";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState } from "react";

import {
	type CreateTaxRegistrationActionState,
	createTaxRegistrationAction,
} from "@/app/actions/create-tax-registration";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

const initialState: CreateTaxRegistrationActionState = null;

type PartyOption = {
	id: string;
	label: string;
};

type CreateTaxRegistrationFormProps = {
	canManage: boolean;
	parties: PartyOption[];
	countryCodes: readonly string[];
};

/**
 * Tax registration create form — CAPABLE when `master_data.manage` is granted.
 */
export function CreateTaxRegistrationForm({
	canManage,
	parties,
	countryCodes,
}: CreateTaxRegistrationFormProps) {
	const [state, formAction, pending] = useActionState(
		createTaxRegistrationAction,
		initialState,
	);

	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Create unavailable</AlertTitle>
				<AlertDescription>
					You can view master data but cannot create tax registrations in this
					organization.
				</AlertDescription>
			</Alert>
		);
	}

	if (parties.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Create a party before attaching a tax registration.
			</p>
		);
	}

	const partyError = actionFieldMessage(state, "partyId");
	const numberError = actionFieldMessage(state, "registrationNumber");
	const showFormError =
		!pending &&
		state?.ok === false &&
		partyError === undefined &&
		numberError === undefined;

	return (
		<form
			action={formAction}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Tax registration created</AlertTitle>
					<AlertDescription>
						{state.data.taxRegistration.registrationType} ·{" "}
						{state.data.taxRegistration.registrationNumber} (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				label="Party"
				required
				fieldId="tax-registration-party"
				error={partyError}
			>
				<NativeSelect
					id="tax-registration-party"
					name="partyId"
					required
					disabled={pending}
					defaultValue={parties[0]?.id}
				>
					{parties.map((party) => (
						<NativeSelectOption key={party.id} value={party.id}>
							{party.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				label="Jurisdiction (country)"
				required
				fieldId="tax-registration-country"
			>
				<NativeSelect
					id="tax-registration-country"
					name="jurisdictionCountryCode"
					required
					disabled={pending}
					defaultValue={countryCodes[0] ?? "MY"}
				>
					{countryCodes.map((code) => (
						<NativeSelectOption key={code} value={code}>
							{code}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				label="Registration type"
				required
				fieldId="tax-registration-type"
			>
				<NativeSelect
					id="tax-registration-type"
					name="registrationType"
					required
					disabled={pending}
					defaultValue="vat_gst"
				>
					{TAX_REGISTRATION_TYPES.map((type) => (
						<NativeSelectOption key={type} value={type}>
							{type}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				label="Registration number"
				required
				fieldId="tax-registration-number"
				error={numberError}
			>
				<Input
					name="registrationNumber"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Display name" fieldId="tax-registration-name">
				<Input name="name" autoComplete="off" disabled={pending} />
			</FormField>
			<FormField label="Valid from" fieldId="tax-registration-valid-from">
				<Input name="validFrom" type="datetime-local" disabled={pending} />
			</FormField>
			<Button type="submit" disabled={pending}>
				{pending ? <Spinner /> : null}
				Create tax registration
			</Button>
		</form>
	);
}
