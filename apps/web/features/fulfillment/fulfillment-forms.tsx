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
import type { ComponentProps, ReactNode } from "react";
import { useActionState } from "react";

import {
	type AddDeliveryLineActionState,
	addDeliveryLineAction,
} from "@/app/actions/add-delivery-line";
import {
	type CancelDeliveryActionState,
	cancelDeliveryAction,
} from "@/app/actions/cancel-delivery";
import {
	type CloseDeliveryActionState,
	closeDeliveryAction,
} from "@/app/actions/close-delivery";
import {
	type ConfirmPackActionState,
	confirmPackAction,
} from "@/app/actions/confirm-pack";
import {
	type ConfirmPickActionState,
	confirmPickAction,
} from "@/app/actions/confirm-pick";
import {
	type CreateDraftDeliveryActionState,
	createDraftDeliveryAction,
} from "@/app/actions/create-draft-delivery";
import {
	type PostDeliveryActionState,
	postDeliveryAction,
} from "@/app/actions/post-delivery";
import {
	type RecordProofOfDeliveryActionState,
	recordProofOfDeliveryAction,
} from "@/app/actions/record-proof-of-delivery";
import {
	type StartPickingActionState,
	startPickingAction,
} from "@/app/actions/start-picking";
import { actionFieldMessage } from "@/modules/platform/schemas/action-result";

function ManageUnavailable({ operation }: { operation: string }) {
	return (
		<Alert role="status">
			<AlertTitle>{operation} unavailable</AlertTitle>
			<AlertDescription>
				You can view deliveries but cannot manage them in this organization.
			</AlertDescription>
		</Alert>
	);
}

function ActionForm({
	action,
	pending,
	children,
}: {
	action: ComponentProps<"form">["action"];
	pending: boolean;
	children: ReactNode;
}) {
	return (
		<form
			action={action}
			aria-busy={pending}
			className="flex max-w-md flex-col gap-(--field-gap)"
		>
			{children}
		</form>
	);
}

function Submit({
	pending,
	children,
}: {
	pending: boolean;
	children: ReactNode;
}) {
	return (
		<Button disabled={pending} type="submit">
			{pending ? <Spinner /> : null}
			{children}
		</Button>
	);
}

function DeliveryVersionFields({
	prefix,
	pending,
	deliveryError,
	versionError,
}: {
	prefix: string;
	pending: boolean;
	deliveryError?: string | undefined;
	versionError?: string | undefined;
}) {
	return (
		<>
			<FormField
				error={deliveryError}
				fieldId={`${prefix}-delivery`}
				label="Delivery id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id={`${prefix}-delivery`}
					name="deliveryId"
					required
				/>
			</FormField>
			<FormField
				error={versionError}
				fieldId={`${prefix}-version`}
				label="Expected version"
				required
			>
				<Input
					disabled={pending}
					id={`${prefix}-version`}
					min="1"
					name="expectedVersion"
					required
					type="number"
				/>
			</FormField>
		</>
	);
}

export function CreateDraftDeliveryForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		createDraftDeliveryAction,
		null satisfies CreateDraftDeliveryActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Create" />;
	}
	const codeError = actionFieldMessage(state, "code");
	const warehouseError = actionFieldMessage(state, "warehouseId");
	const showFormError =
		!pending &&
		state?.ok === false &&
		codeError === undefined &&
		warehouseError === undefined;
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Delivery created</AlertTitle>
					<AlertDescription>
						{state.data.delivery.code} · {state.data.delivery.status}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<FormField
				error={codeError}
				fieldId="delivery-code"
				label="Code"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-code"
					name="code"
					required
				/>
			</FormField>
			<FormField
				error={warehouseError}
				fieldId="delivery-warehouse"
				label="Warehouse id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-warehouse"
					name="warehouseId"
					required
				/>
			</FormField>
			<FormField
				fieldId="delivery-sales-order"
				label="Sales order id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-sales-order"
					name="salesOrderId"
				/>
			</FormField>
			<FormField
				fieldId="delivery-party-id"
				label="Ship-to party id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-party-id"
					name="shipToPartyId"
				/>
			</FormField>
			<FormField
				fieldId="delivery-party-code"
				label="Ship-to party code (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-party-code"
					name="shipToPartyCode"
				/>
			</FormField>
			<FormField
				fieldId="delivery-party-name"
				label="Ship-to party name (optional)"
			>
				<Input
					disabled={pending}
					id="delivery-party-name"
					name="shipToPartyName"
				/>
			</FormField>
			<Submit pending={pending}>Create draft delivery</Submit>
		</ActionForm>
	);
}

export function AddDeliveryLineForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		addDeliveryLineAction,
		null satisfies AddDeliveryLineActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Add line" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const itemError = actionFieldMessage(state, "itemId");
	const quantityError = actionFieldMessage(state, "quantityToDeliver");
	const showFormError =
		!pending &&
		state?.ok === false &&
		[deliveryError, versionError, itemError, quantityError].every(
			(message) => message === undefined,
		);
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Line added</AlertTitle>
					<AlertDescription>
						Line {state.data.line.lineNo} · {state.data.line.itemCode} ×{" "}
						{state.data.line.quantityToDeliver}.
					</AlertDescription>
				</Alert>
			) : null}
			{showFormError && state?.ok === false ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="delivery-line"
				versionError={versionError}
			/>
			<FormField
				error={itemError}
				fieldId="delivery-line-item"
				label="Item id"
				required
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-line-item"
					name="itemId"
					required
				/>
			</FormField>
			<FormField
				fieldId="delivery-line-ordered"
				label="Ordered quantity (optional)"
			>
				<Input
					disabled={pending}
					id="delivery-line-ordered"
					min="0.000001"
					name="quantityOrdered"
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				error={quantityError}
				fieldId="delivery-line-quantity"
				label="Quantity to deliver"
				required
			>
				<Input
					disabled={pending}
					id="delivery-line-quantity"
					min="0.000001"
					name="quantityToDeliver"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<FormField
				fieldId="delivery-line-sales-order"
				label="Sales order line id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-line-sales-order"
					name="salesOrderLineId"
				/>
			</FormField>
			<Submit pending={pending}>Add delivery line</Submit>
		</ActionForm>
	);
}

export function StartPickingForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		startPickingAction,
		null satisfies StartPickingActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Start picking" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Picking started</AlertTitle>
					<AlertDescription>
						{state.data.delivery.code} · picking.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			deliveryError === undefined &&
			versionError === undefined ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="start-picking"
				versionError={versionError}
			/>
			<Submit pending={pending}>Start picking</Submit>
		</ActionForm>
	);
}

export function ConfirmPickForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		confirmPickAction,
		null satisfies ConfirmPickActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Confirm pick" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const lineError = actionFieldMessage(state, "deliveryLineId");
	const reservationError = actionFieldMessage(state, "reservationId");
	const quantityError = actionFieldMessage(state, "quantityPicked");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Pick confirmed</AlertTitle>
					<AlertDescription>
						{state.data.pick.quantityPicked} picked.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			[
				deliveryError,
				versionError,
				lineError,
				reservationError,
				quantityError,
			].every((message) => message === undefined) ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="confirm-pick"
				versionError={versionError}
			/>
			<FormField
				error={lineError}
				fieldId="confirm-pick-line"
				label="Delivery line id"
				required
			>
				<Input
					disabled={pending}
					id="confirm-pick-line"
					name="deliveryLineId"
					required
				/>
			</FormField>
			<FormField
				error={reservationError}
				fieldId="confirm-pick-reservation"
				label="Reservation id (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="confirm-pick-reservation"
					name="reservationId"
					placeholder="Leave blank to reserve via Inventory"
				/>
			</FormField>
			<p className="text-muted-foreground text-sm">
				Omit reservation to call Inventory <code>reserveStock</code> for the
				pick quantity (<code>inventory.reservation.create</code> required).
			</p>
			<FormField
				error={quantityError}
				fieldId="confirm-pick-quantity"
				label="Quantity picked"
				required
			>
				<Input
					disabled={pending}
					id="confirm-pick-quantity"
					min="0.000001"
					name="quantityPicked"
					required
					step="any"
					type="number"
				/>
			</FormField>
			<Submit pending={pending}>Confirm pick</Submit>
		</ActionForm>
	);
}

export function ConfirmPackForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		confirmPackAction,
		null satisfies ConfirmPackActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Confirm pack" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Pack confirmed</AlertTitle>
					<AlertDescription>
						{state.data.pack.packageCode ?? "Uncoded package"} packed.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			deliveryError === undefined &&
			versionError === undefined ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="confirm-pack"
				versionError={versionError}
			/>
			<FormField fieldId="confirm-pack-code" label="Package code (optional)">
				<Input disabled={pending} id="confirm-pack-code" name="packageCode" />
			</FormField>
			<FormField fieldId="confirm-pack-notes" label="Notes (optional)">
				<Input disabled={pending} id="confirm-pack-notes" name="notes" />
			</FormField>
			<Submit pending={pending}>Confirm pack</Submit>
		</ActionForm>
	);
}

export function PostDeliveryForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		postDeliveryAction,
		null satisfies PostDeliveryActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Post" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Delivery posted</AlertTitle>
					<AlertDescription>
						{state.data.delivery.code} · posted.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			deliveryError === undefined &&
			versionError === undefined ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="post-delivery"
				versionError={versionError}
			/>
			<Submit pending={pending}>Post delivery</Submit>
		</ActionForm>
	);
}

export function RecordProofOfDeliveryForm({
	canManage,
}: {
	canManage: boolean;
}) {
	const [state, formAction, pending] = useActionState(
		recordProofOfDeliveryAction,
		null satisfies RecordProofOfDeliveryActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Record proof" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	const recipientError = actionFieldMessage(state, "receivedByName");
	const outcomeError = actionFieldMessage(state, "outcome");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Proof recorded</AlertTitle>
					<AlertDescription>
						{state.data.proofOfDelivery.outcome} · received by{" "}
						{state.data.proofOfDelivery.receivedByName}.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			[deliveryError, versionError, recipientError, outcomeError].every(
				(message) => message === undefined,
			) ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="delivery-pod"
				versionError={versionError}
			/>
			<FormField
				error={outcomeError}
				fieldId="delivery-pod-outcome"
				label="Outcome"
				required
			>
				<NativeSelect
					defaultValue=""
					disabled={pending}
					id="delivery-pod-outcome"
					name="outcome"
					required
				>
					<NativeSelectOption disabled value="">
						Select outcome
					</NativeSelectOption>
					<NativeSelectOption value="delivered">delivered</NativeSelectOption>
					<NativeSelectOption value="partially_delivered">
						partially_delivered
					</NativeSelectOption>
					<NativeSelectOption value="refused">refused</NativeSelectOption>
					<NativeSelectOption value="failed">failed</NativeSelectOption>
				</NativeSelect>
			</FormField>
			<FormField
				error={recipientError}
				fieldId="delivery-pod-recipient"
				label="Received by"
				required
			>
				<Input
					disabled={pending}
					id="delivery-pod-recipient"
					name="receivedByName"
					required
				/>
			</FormField>
			<FormField
				fieldId="delivery-pod-proof-type"
				label="Proof type (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-pod-proof-type"
					name="proofType"
				/>
			</FormField>
			<FormField
				fieldId="delivery-pod-evidence"
				label="Evidence ref (optional)"
			>
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-pod-evidence"
					name="evidenceRef"
				/>
			</FormField>
			<FormField fieldId="delivery-pod-carrier" label="Carrier ref (optional)">
				<Input
					autoComplete="off"
					disabled={pending}
					id="delivery-pod-carrier"
					name="carrierRef"
				/>
			</FormField>
			<FormField fieldId="delivery-pod-at" label="Recorded at (optional)">
				<Input
					disabled={pending}
					id="delivery-pod-at"
					name="recordedAt"
					type="datetime-local"
				/>
			</FormField>
			<FormField fieldId="delivery-pod-notes" label="Notes (optional)">
				<Input disabled={pending} id="delivery-pod-notes" name="notes" />
			</FormField>
			<Submit pending={pending}>Record proof of delivery</Submit>
		</ActionForm>
	);
}

export function CancelDeliveryForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		cancelDeliveryAction,
		null satisfies CancelDeliveryActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Cancel" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Delivery cancelled</AlertTitle>
					<AlertDescription>
						{state.data.delivery.code} · cancelled.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			deliveryError === undefined &&
			versionError === undefined ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="cancel-delivery"
				versionError={versionError}
			/>
			<Submit pending={pending}>Cancel delivery</Submit>
		</ActionForm>
	);
}

export function CloseDeliveryForm({ canManage }: { canManage: boolean }) {
	const [state, formAction, pending] = useActionState(
		closeDeliveryAction,
		null satisfies CloseDeliveryActionState,
	);
	if (!canManage) {
		return <ManageUnavailable operation="Close" />;
	}
	const deliveryError = actionFieldMessage(state, "deliveryId");
	const versionError = actionFieldMessage(state, "expectedVersion");
	return (
		<ActionForm action={formAction} pending={pending}>
			{state?.ok === true ? (
				<Alert role="status">
					<AlertTitle>Delivery closed</AlertTitle>
					<AlertDescription>
						{state.data.delivery.code} · closed.
					</AlertDescription>
				</Alert>
			) : null}
			{state?.ok === false &&
			deliveryError === undefined &&
			versionError === undefined ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				deliveryError={deliveryError}
				pending={pending}
				prefix="close-delivery"
				versionError={versionError}
			/>
			<Submit pending={pending}>Close delivery</Submit>
		</ActionForm>
	);
}
