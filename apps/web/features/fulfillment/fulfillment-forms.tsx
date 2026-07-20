"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	Input,
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
		<Button type="submit" disabled={pending}>
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
	deliveryError?: string;
	versionError?: string;
}) {
	return (
		<>
			<FormField
				label="Delivery id"
				required
				fieldId={`${prefix}-delivery`}
				error={deliveryError}
			>
				<Input
					id={`${prefix}-delivery`}
					name="deliveryId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Expected version"
				required
				fieldId={`${prefix}-version`}
				error={versionError}
			>
				<Input
					id={`${prefix}-version`}
					name="expectedVersion"
					type="number"
					min="1"
					required
					disabled={pending}
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
	if (!canManage) return <ManageUnavailable operation="Create" />;
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
				label="Code"
				required
				fieldId="delivery-code"
				error={codeError}
			>
				<Input
					id="delivery-code"
					name="code"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Warehouse id"
				required
				fieldId="delivery-warehouse"
				error={warehouseError}
			>
				<Input
					id="delivery-warehouse"
					name="warehouseId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Sales order id (optional)"
				fieldId="delivery-sales-order"
			>
				<Input
					id="delivery-sales-order"
					name="salesOrderId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Ship-to party id (optional)"
				fieldId="delivery-party-id"
			>
				<Input
					id="delivery-party-id"
					name="shipToPartyId"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Ship-to party code (optional)"
				fieldId="delivery-party-code"
			>
				<Input
					id="delivery-party-code"
					name="shipToPartyCode"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Ship-to party name (optional)"
				fieldId="delivery-party-name"
			>
				<Input
					id="delivery-party-name"
					name="shipToPartyName"
					disabled={pending}
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
	if (!canManage) return <ManageUnavailable operation="Add line" />;
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
				prefix="delivery-line"
				pending={pending}
				deliveryError={deliveryError}
				versionError={versionError}
			/>
			<FormField
				label="Item id"
				required
				fieldId="delivery-line-item"
				error={itemError}
			>
				<Input
					id="delivery-line-item"
					name="itemId"
					required
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Ordered quantity (optional)"
				fieldId="delivery-line-ordered"
			>
				<Input
					id="delivery-line-ordered"
					name="quantityOrdered"
					type="number"
					step="any"
					min="0.000001"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Quantity to deliver"
				required
				fieldId="delivery-line-quantity"
				error={quantityError}
			>
				<Input
					id="delivery-line-quantity"
					name="quantityToDeliver"
					type="number"
					step="any"
					min="0.000001"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Sales order line id (optional)"
				fieldId="delivery-line-sales-order"
			>
				<Input
					id="delivery-line-sales-order"
					name="salesOrderLineId"
					autoComplete="off"
					disabled={pending}
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
	if (!canManage) return <ManageUnavailable operation="Start picking" />;
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
				prefix="start-picking"
				pending={pending}
				deliveryError={deliveryError}
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
	if (!canManage) return <ManageUnavailable operation="Confirm pick" />;
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
				prefix="confirm-pick"
				pending={pending}
				deliveryError={deliveryError}
				versionError={versionError}
			/>
			<FormField
				label="Delivery line id"
				required
				fieldId="confirm-pick-line"
				error={lineError}
			>
				<Input
					id="confirm-pick-line"
					name="deliveryLineId"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Reservation id (optional)"
				fieldId="confirm-pick-reservation"
				error={reservationError}
			>
				<Input
					id="confirm-pick-reservation"
					name="reservationId"
					autoComplete="off"
					disabled={pending}
					placeholder="Leave blank to reserve via Inventory"
				/>
			</FormField>
			<p className="text-sm text-muted-foreground">
				Omit reservation to call Inventory <code>reserveStock</code> for the
				pick quantity (<code>inventory.reservation.create</code> required).
			</p>
			<FormField
				label="Quantity picked"
				required
				fieldId="confirm-pick-quantity"
				error={quantityError}
			>
				<Input
					id="confirm-pick-quantity"
					name="quantityPicked"
					type="number"
					step="any"
					min="0.000001"
					required
					disabled={pending}
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
	if (!canManage) return <ManageUnavailable operation="Confirm pack" />;
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
				prefix="confirm-pack"
				pending={pending}
				deliveryError={deliveryError}
				versionError={versionError}
			/>
			<FormField label="Package code (optional)" fieldId="confirm-pack-code">
				<Input id="confirm-pack-code" name="packageCode" disabled={pending} />
			</FormField>
			<FormField label="Notes (optional)" fieldId="confirm-pack-notes">
				<Input id="confirm-pack-notes" name="notes" disabled={pending} />
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
	if (!canManage) return <ManageUnavailable operation="Post" />;
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
				prefix="post-delivery"
				pending={pending}
				deliveryError={deliveryError}
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
	if (!canManage) return <ManageUnavailable operation="Record proof" />;
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
			[
				deliveryError,
				versionError,
				recipientError,
				outcomeError,
			].every((message) => message === undefined) ? (
				<FormError>{state.message}</FormError>
			) : null}
			<DeliveryVersionFields
				prefix="delivery-pod"
				pending={pending}
				deliveryError={deliveryError}
				versionError={versionError}
			/>
			<FormField
				label="Outcome"
				required
				fieldId="delivery-pod-outcome"
				error={outcomeError}
			>
				<select
					id="delivery-pod-outcome"
					name="outcome"
					required
					className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					disabled={pending}
					defaultValue=""
				>
					<option value="" disabled>
						Select outcome
					</option>
					<option value="delivered">delivered</option>
					<option value="partially_delivered">partially_delivered</option>
					<option value="refused">refused</option>
					<option value="failed">failed</option>
				</select>
			</FormField>
			<FormField
				label="Received by"
				required
				fieldId="delivery-pod-recipient"
				error={recipientError}
			>
				<Input
					id="delivery-pod-recipient"
					name="receivedByName"
					required
					disabled={pending}
				/>
			</FormField>
			<FormField label="Proof type (optional)" fieldId="delivery-pod-proof-type">
				<Input
					id="delivery-pod-proof-type"
					name="proofType"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField
				label="Evidence ref (optional)"
				fieldId="delivery-pod-evidence"
			>
				<Input
					id="delivery-pod-evidence"
					name="evidenceRef"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Carrier ref (optional)" fieldId="delivery-pod-carrier">
				<Input
					id="delivery-pod-carrier"
					name="carrierRef"
					autoComplete="off"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Recorded at (optional)" fieldId="delivery-pod-at">
				<Input
					id="delivery-pod-at"
					name="recordedAt"
					type="datetime-local"
					disabled={pending}
				/>
			</FormField>
			<FormField label="Notes (optional)" fieldId="delivery-pod-notes">
				<Input id="delivery-pod-notes" name="notes" disabled={pending} />
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
	if (!canManage) return <ManageUnavailable operation="Cancel" />;
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
				prefix="cancel-delivery"
				pending={pending}
				deliveryError={deliveryError}
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
	if (!canManage) return <ManageUnavailable operation="Close" />;
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
				prefix="close-delivery"
				pending={pending}
				deliveryError={deliveryError}
				versionError={versionError}
			/>
			<Submit pending={pending}>Close delivery</Submit>
		</ActionForm>
	);
}
