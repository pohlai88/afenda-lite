// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import type { TaxRegistrationProjection } from "@afenda/master-data";
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

interface TaxRegistrationLifecycleFormProps {
	canManage: boolean;
	registrations: TaxRegistrationProjection[];
}

const activateInitial: ActivateTaxRegistrationActionState = null;
const blockInitial: BlockTaxRegistrationActionState = null;
const retireInitial: RetireTaxRegistrationActionState = null;
const restoreInitial: RestoreTaxRegistrationActionState = null;

/**
 * Tax-registration lifecycle — activate / block / retire / restore with CAS.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lifecycle branches share one CAS-governed form surface.
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
			<p className="text-muted-foreground text-sm">
				No tax registrations to transition.
			</p>
		);
	}

	const selected =
		selectable.find((row) => row.id === selectedId) ?? selectable[0];
	if (selected === undefined) {
		return (
			<p className="text-muted-foreground text-sm">
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
						{success.data.taxRegistration.maskedRegistrationNumber} is now{" "}
						{success.data.taxRegistration.status} (v
						{success.data.taxRegistration.version}).
					</AlertDescription>
				</Alert>
			) : null}
			{failure?.ok === false ? <FormError>{failure.message}</FormError> : null}
			<FormField
				fieldId="tax-registration-lifecycle-select"
				label="Tax registration"
			>
				<NativeSelect
					disabled={pending}
					id="tax-registration-lifecycle-select"
					onChange={(event) => setSelectedId(event.target.value)}
					value={selected.id}
				>
					{selectable.map((row) => (
						<NativeSelectOption key={row.id} value={row.id}>
							{row.taxType} · {row.maskedRegistrationNumber} · {row.status} · v
							{row.version}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<div className="flex flex-wrap gap-2">
				{canActivate ? (
					<form action={activateAction}>
						<input name="taxRegistrationId" type="hidden" value={selected.id} />
						<input
							name="expectedVersion"
							type="hidden"
							value={selected.version}
						/>
						<Button disabled={pending} type="submit" variant="outline">
							{activatePending ? <Spinner /> : null}
							Activate
						</Button>
					</form>
				) : null}
				{canBlock ? (
					<form action={blockAction}>
						<input name="taxRegistrationId" type="hidden" value={selected.id} />
						<input
							name="expectedVersion"
							type="hidden"
							value={selected.version}
						/>
						<Button disabled={pending} type="submit" variant="outline">
							{blockPending ? <Spinner /> : null}
							Block
						</Button>
					</form>
				) : null}
				{canRetire ? (
					<form action={retireAction}>
						<input name="taxRegistrationId" type="hidden" value={selected.id} />
						<input
							name="expectedVersion"
							type="hidden"
							value={selected.version}
						/>
						<Button disabled={pending} type="submit" variant="outline">
							{retirePending ? <Spinner /> : null}
							Retire
						</Button>
					</form>
				) : null}
				{canRestore ? (
					<form action={restoreAction}>
						<input name="taxRegistrationId" type="hidden" value={selected.id} />
						<input
							name="expectedVersion"
							type="hidden"
							value={selected.version}
						/>
						<Button disabled={pending} type="submit" variant="outline">
							{restorePending ? <Spinner /> : null}
							Restore
						</Button>
					</form>
				) : null}
			</div>
		</div>
	);
}
