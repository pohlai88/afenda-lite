// biome-ignore-all lint/performance/noJsxPropsBind: The enabled React Compiler stabilizes JSX callback props.
"use client";

import type { PaymentTerm } from "@afenda/master-data";
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
	type ActivatePaymentTermActionState,
	activatePaymentTermAction,
} from "@/app/actions/activate-payment-term";
import {
	type InactivePaymentTermActionState,
	inactivePaymentTermAction,
} from "@/app/actions/inactive-payment-term";
import {
	type RetirePaymentTermActionState,
	retirePaymentTermAction,
} from "@/app/actions/retire-payment-term";

interface PaymentTermLifecycleFormProps {
	canManage: boolean;
	terms: PaymentTerm[];
}

const activateInitial: ActivatePaymentTermActionState = null;
const inactiveInitial: InactivePaymentTermActionState = null;
const retireInitial: RetirePaymentTermActionState = null;

/**
 * Payment-term lifecycle controls — activate / inactive / retire with CAS.
 * Party activate stays MDG-gated; payment terms use direct manage transitions.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lifecycle branches share one CAS-governed form surface.
export function PaymentTermLifecycleForm({
	canManage,
	terms,
}: PaymentTermLifecycleFormProps) {
	const liveTerms = terms.filter((term) => term.status !== "retired");
	const [selectedId, setSelectedId] = useState(liveTerms[0]?.id ?? "");

	const [activateState, activateAction, activatePending] = useActionState(
		activatePaymentTermAction,
		activateInitial,
	);
	const [inactiveState, inactiveAction, inactivePending] = useActionState(
		inactivePaymentTermAction,
		inactiveInitial,
	);
	const [retireState, retireAction, retirePending] = useActionState(
		retirePaymentTermAction,
		retireInitial,
	);

	if (!canManage) {
		return null;
	}

	if (liveTerms.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No live payment terms to transition.
			</p>
		);
	}

	const selected =
		liveTerms.find((term) => term.id === selectedId) ?? liveTerms[0];
	if (selected === undefined) {
		return (
			<p className="text-muted-foreground text-sm">
				No live payment terms to transition.
			</p>
		);
	}
	const pending = activatePending || inactivePending || retirePending;
	const failure =
		(!activatePending && activateState?.ok === false && activateState) ||
		(!inactivePending && inactiveState?.ok === false && inactiveState) ||
		(!retirePending && retireState?.ok === false && retireState) ||
		null;
	const success =
		(!activatePending && activateState?.ok === true && activateState) ||
		(!inactivePending && inactiveState?.ok === true && inactiveState) ||
		(!retirePending && retireState?.ok === true && retireState) ||
		null;

	const canActivate =
		selected.status === "draft" || selected.status === "inactive";
	const canInactive = selected.status === "active";
	const canRetire =
		selected.status === "draft" ||
		selected.status === "active" ||
		selected.status === "inactive";

	return (
		<div className="flex max-w-md flex-col gap-(--field-gap)">
			{success?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Lifecycle updated</AlertTitle>
					<AlertDescription>
						{success.data.paymentTerm.code} is now{" "}
						{success.data.paymentTerm.status} (v
						{success.data.paymentTerm.version}
						).
					</AlertDescription>
				</Alert>
			) : null}
			{failure?.ok === false ? <FormError>{failure.message}</FormError> : null}
			<FormField fieldId="payment-term-lifecycle-select" label="Payment term">
				<NativeSelect
					disabled={pending}
					id="payment-term-lifecycle-select"
					onChange={(event) => setSelectedId(event.target.value)}
					value={selected.id}
				>
					{liveTerms.map((term) => (
						<NativeSelectOption key={term.id} value={term.id}>
							{term.code} · {term.status} · v{term.version}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</FormField>
			<div className="flex flex-wrap gap-2">
				{canActivate ? (
					<form action={activateAction}>
						<input name="paymentTermId" type="hidden" value={selected.id} />
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
				{canInactive ? (
					<form action={inactiveAction}>
						<input name="paymentTermId" type="hidden" value={selected.id} />
						<input
							name="expectedVersion"
							type="hidden"
							value={selected.version}
						/>
						<Button disabled={pending} type="submit" variant="outline">
							{inactivePending ? <Spinner /> : null}
							Set inactive
						</Button>
					</form>
				) : null}
				{canRetire ? (
					<form action={retireAction}>
						<input name="paymentTermId" type="hidden" value={selected.id} />
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
			</div>
		</div>
	);
}
