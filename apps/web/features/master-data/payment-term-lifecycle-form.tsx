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

type PaymentTermLifecycleFormProps = {
	canManage: boolean;
	terms: PaymentTerm[];
};

const activateInitial: ActivatePaymentTermActionState = null;
const inactiveInitial: InactivePaymentTermActionState = null;
const retireInitial: RetirePaymentTermActionState = null;

/**
 * Payment-term lifecycle controls — activate / inactive / retire with CAS.
 * Party activate stays MDG-gated; payment terms use direct manage transitions.
 */
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
			<p className="text-sm text-muted-foreground">
				No live payment terms to transition.
			</p>
		);
	}

	const selected =
		liveTerms.find((term) => term.id === selectedId) ?? liveTerms[0];
	if (selected === undefined) {
		return (
			<p className="text-sm text-muted-foreground">
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
			<FormField label="Payment term" fieldId="payment-term-lifecycle-select">
				<NativeSelect
					id="payment-term-lifecycle-select"
					value={selected.id}
					onChange={(event) => setSelectedId(event.target.value)}
					disabled={pending}
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
						<input type="hidden" name="paymentTermId" value={selected.id} />
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
				{canInactive ? (
					<form action={inactiveAction}>
						<input type="hidden" name="paymentTermId" value={selected.id} />
						<input
							type="hidden"
							name="expectedVersion"
							value={selected.version}
						/>
						<Button type="submit" variant="outline" disabled={pending}>
							{inactivePending ? <Spinner /> : null}
							Set inactive
						</Button>
					</form>
				) : null}
				{canRetire ? (
					<form action={retireAction}>
						<input type="hidden" name="paymentTermId" value={selected.id} />
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
			</div>
		</div>
	);
}
