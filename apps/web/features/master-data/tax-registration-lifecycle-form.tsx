"use client";

import type { TaxRegistration } from "@afenda/master-data";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	NativeSelect,
	NativeSelectOption,
	Spinner,
} from "@afenda/ui-system";
import { useActionState, useState } from "react";

import {
	type ActivateTaxRegistrationActionState,
	activateTaxRegistrationAction,
} from "@/app/actions/activate-tax-registration";
import {
	type BlockTaxRegistrationActionState,
	blockTaxRegistrationAction,
} from "@/app/actions/block-tax-registration";
import {
	type RestoreTaxRegistrationActionState,
	restoreTaxRegistrationAction,
} from "@/app/actions/restore-tax-registration";
import {
	type RetireTaxRegistrationActionState,
	retireTaxRegistrationAction,
} from "@/app/actions/retire-tax-registration";

type TaxRegistrationLifecycleFormProps = {
	canManage: boolean;
	registrations: TaxRegistration[];
};

const activateInitial: ActivateTaxRegistrationActionState = null;
const blockInitial: BlockTaxRegistrationActionState = null;
const retireInitial: RetireTaxRegistrationActionState = null;
const restoreInitial: RestoreTaxRegistrationActionState = null;

/**
 * Tax-registration lifecycle — activate / block / retire / restore with CAS.
 */
export function TaxRegistrationLifecycleForm({
	canManage,
	registrations,
}: TaxRegistrationLifecycleFormProps) {
	const selectable = registrations;
	const [selectedId, setSelectedId] = useState(selectable[0]?.id ?? "");

	const [activateState, activateAction, activatePending] = useActionState(
		activateTaxRegistrationAction,
		activateInitial,
	);
	const [blockState, blockAction, blockPending] = useActionState(
		blockTaxRegistrationAction,
		blockInitial,
	);
	const [retireState, retireAction, retirePending] = useActionState(
		retireTaxRegistrationAction,
		retireInitial,
	);
	const [restoreState, restoreAction, restorePending] = useActionState(
		restoreTaxRegistrationAction,
		restoreInitial,
	);

	if (!canManage) {
		return null;
	}

	if (selectable.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No tax registrations to transition.
			</p>
		);
	}

	const selected =
		selectable.find((row) => row.id === selectedId) ?? selectable[0];
	if (selected === undefined) {
		return (
			<p className="text-sm text-muted-foreground">
				No tax registrations to transition.
			</p>
		);
	}

	const pending =
		activatePending || blockPending || retirePending || restorePending;
	const failure =
		(!activatePending && activateState?.ok === false && activateState) ||
		(!blockPending && blockState?.ok === false && blockState) ||
		(!retirePending && retireState?.ok === false && retireState) ||
		(!restorePending && restoreState?.ok === false && restoreState) ||
		null;
	const success =
		(!activatePending && activateState?.ok === true && activateState) ||
		(!blockPending && blockState?.ok === true && blockState) ||
		(!retirePending && retireState?.ok === true && retireState) ||
		(!restorePending && restoreState?.ok === true && restoreState) ||
		null;

	const canActivate =
		selected.status === "draft" || selected.status === "blocked";
	const canBlock = selected.status === "active";
	const canRetire =
		selected.status === "draft" ||
		selected.status === "active" ||
		selected.status === "blocked";
	const canRestore = selected.status === "retired";

	return (
		<div className="flex max-w-md flex-col gap-(--field-gap)">
			{success?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Lifecycle updated</AlertTitle>
					<AlertDescription>
						{success.data.taxRegistration.registrationNumber} is now{" "}
						{success.data.taxRegistration.status} (v
						{success.data.taxRegistration.version}).
					</AlertDescription>
				</Alert>
			) : null}
			{failure?.ok === false ? <FormError>{failure.message}</FormError> : null}
			<FormField
				label="Tax registration"
				fieldId="tax-registration-lifecycle-select"
			>
				<NativeSelect
					id="tax-registration-lifecycle-select"
					value={selected.id}
					onChange={(event) => setSelectedId(event.target.value)}
					disabled={pending}
				>
					{selectable.map((row) => (
						<NativeSelectOption key={row.id} value={row.id}>
							{row.registrationType} · {row.registrationNumber} · {row.status} ·
							v{row.version}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<div className="flex flex-wrap gap-2">
				{canActivate ? (
					<form action={activateAction}>
						<input type="hidden" name="taxRegistrationId" value={selected.id} />
						<input
							type="hidden"
							name="expectedVersion"
							value={selected.version}
						/>
						<Button type="submit" variant="outline" disabled={pending}>
							{activatePending ? <Spinner /> : null}
							Activate
						</Button>
					</form>
				) : null}
				{canBlock ? (
					<form action={blockAction}>
						<input type="hidden" name="taxRegistrationId" value={selected.id} />
						<input
							type="hidden"
							name="expectedVersion"
							value={selected.version}
						/>
						<Button type="submit" variant="outline" disabled={pending}>
							{blockPending ? <Spinner /> : null}
							Block
						</Button>
					</form>
				) : null}
				{canRetire ? (
					<form action={retireAction}>
						<input type="hidden" name="taxRegistrationId" value={selected.id} />
						<input
							type="hidden"
							name="expectedVersion"
							value={selected.version}
						/>
						<Button type="submit" variant="outline" disabled={pending}>
							{retirePending ? <Spinner /> : null}
							Retire
						</Button>
					</form>
				) : null}
				{canRestore ? (
					<form action={restoreAction}>
						<input type="hidden" name="taxRegistrationId" value={selected.id} />
						<input
							type="hidden"
							name="expectedVersion"
							value={selected.version}
						/>
						<Button type="submit" variant="outline" disabled={pending}>
							{restorePending ? <Spinner /> : null}
							Restore
						</Button>
					</form>
				) : null}
			</div>
		</div>
	);
}
