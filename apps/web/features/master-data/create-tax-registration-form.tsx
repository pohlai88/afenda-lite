"use client";

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

interface PartyOption {
	id: string;
	label: string;
}

interface CreateTaxRegistrationFormProps {
	canManage: boolean;
	countryCodes: readonly string[];
	parties: PartyOption[];
	registrationTypes: readonly string[];
}

/**
 * Tax-registration create form — visible with its exact package capability.
 */
export function CreateTaxRegistrationForm({
	canManage,
	parties,
	countryCodes,
	registrationTypes,
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
			<p className="text-muted-foreground text-sm">
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
						{state.data.taxRegistration.taxType} ·{" "}
						{state.data.taxRegistration.maskedRegistrationNumber} (draft).
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={partyError}
				fieldId="tax-registration-party"
				label="Party"
				required
			>
				<NativeSelect
					defaultValue={parties[0]?.id}
					disabled={pending}
					id="tax-registration-party"
					name="partyId"
					required
				>
					{parties.map((party) => (
						<NativeSelectOption key={party.id} value={party.id}>
							{party.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				fieldId="tax-registration-country"
				label="Jurisdiction (country)"
				required
			>
				<NativeSelect
					defaultValue={countryCodes[0] ?? "MY"}
					disabled={pending}
					id="tax-registration-country"
					name="jurisdictionCountryCode"
					required
				>
					{countryCodes.map((code) => (
						<NativeSelectOption key={code} value={code}>
							{code}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				fieldId="tax-registration-type"
				label="Registration type"
				required
			>
				<NativeSelect
					defaultValue="vat_gst"
					disabled={pending}
					id="tax-registration-type"
					name="registrationType"
					required
				>
					{registrationTypes.map((type) => (
						<NativeSelectOption key={type} value={type}>
							{type}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<FormField
				error={numberError}
				fieldId="tax-registration-number"
				label="Registration number"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					name="registrationNumber"
					required
				/>
			</FormField>
			<FormField fieldId="tax-registration-name" label="Display name">
				<Input autoComplete="off" disabled={pending} name="name" />
			</FormField>
			<FormField fieldId="tax-registration-valid-from" label="Valid from">
				<Input disabled={pending} name="validFrom" type="datetime-local" />
			</FormField>
			<Button disabled={pending} type="submit">
				{pending ? <Spinner /> : null}
				Create tax registration
			</Button>
		</form>
	);
}
