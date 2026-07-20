"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	FormError,
	FormField,
	NativeSelect,
	Spinner,
} from "@afenda/ui-system";
import { useActionState, type ReactNode } from "react";

import {
	activateItemAction,
	activateItemGroupAction,
	activateWarehouseAction,
	inactiveItemAction,
	inactiveItemGroupAction,
	inactiveWarehouseAction,
	retireItemAction,
	retireItemGroupAction,
	retireWarehouseAction,
} from "@/app/actions/master-root-lifecycle";

type Option = { id: string; label: string; version: number; status: string };

function VersionedSelect({
	name,
	options,
	disabled,
	fieldId,
	label,
}: {
	name: string;
	options: Option[];
	disabled: boolean;
	fieldId: string;
	label: string;
}) {
	return (
		<FormField label={label} fieldId={fieldId}>
			<NativeSelect
				id={fieldId}
				name={name}
				required
				disabled={disabled || options.length === 0}
				onChange={(event) => {
					const selected = options.find((row) => row.id === event.target.value);
					const versionInput = event.currentTarget.form?.elements.namedItem(
						"expectedVersion",
					);
					if (selected && versionInput instanceof HTMLInputElement) {
						versionInput.value = String(selected.version);
					}
				}}
			>
				<option value="">Select</option>
				{options.map((row) => (
					<option key={row.id} value={row.id}>
						{row.label} · {row.status} · v{row.version}
					</option>
				))}
			</NativeSelect>
		</FormField>
	);
}

function LifecycleShell({
	canManage,
	title,
	lastOk,
	lastError,
	children,
}: {
	canManage: boolean;
	title: string;
	lastOk: boolean;
	lastError: string | null;
	children: ReactNode;
}) {
	if (!canManage) {
		return (
			<Alert role="status">
				<AlertTitle>Lifecycle unavailable</AlertTitle>
				<AlertDescription>
					You can view {title.toLowerCase()} but cannot change lifecycle.
				</AlertDescription>
			</Alert>
		);
	}
	return (
		<div className="flex flex-col gap-(--field-gap)">
			{lastOk ? (
				<Alert role="status">
					<AlertTitle>Lifecycle updated</AlertTitle>
					<AlertDescription>{title} status changed.</AlertDescription>
				</Alert>
			) : null}
			{lastError ? <FormError>{lastError}</FormError> : null}
			{children}
		</div>
	);
}

function ItemLifecycleControls({
	canManage,
	title,
	options,
}: {
	canManage: boolean;
	title: string;
	options: Option[];
}) {
	const [activateState, activateAction, activatePending] = useActionState(
		activateItemAction,
		null,
	);
	const [inactiveState, inactiveAction, inactivePending] = useActionState(
		inactiveItemAction,
		null,
	);
	const [retireState, retireAction, retirePending] = useActionState(
		retireItemAction,
		null,
	);
	const pending = activatePending || inactivePending || retirePending;
	const draft = options.filter((row) => row.status === "draft");
	const active = options.filter((row) => row.status === "active");
	const inactive = options.filter((row) => row.status === "inactive");
	const retireable = [...draft, ...active, ...inactive];
	return (
		<LifecycleShell
			canManage={canManage}
			title={title}
			lastOk={
				activateState?.ok === true ||
				inactiveState?.ok === true ||
				retireState?.ok === true
			}
			lastError={
				(activateState?.ok === false && activateState.message) ||
				(inactiveState?.ok === false && inactiveState.message) ||
				(retireState?.ok === false && retireState.message) ||
				null
			}
		>
			<form action={activateAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={draft}
					disabled={pending}
					fieldId="item-activate"
					label={`Activate ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || draft.length === 0}>
					{activatePending ? <Spinner /> : null}
					Activate
				</Button>
			</form>
			<form action={inactiveAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={active}
					disabled={pending}
					fieldId="item-inactive"
					label={`Inactive ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || active.length === 0}>
					{inactivePending ? <Spinner /> : null}
					Set inactive
				</Button>
			</form>
			<form action={retireAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={retireable}
					disabled={pending}
					fieldId="item-retire"
					label={`Retire ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || retireable.length === 0}>
					{retirePending ? <Spinner /> : null}
					Retire
				</Button>
			</form>
		</LifecycleShell>
	);
}

function ItemGroupLifecycleControls({
	canManage,
	title,
	options,
}: {
	canManage: boolean;
	title: string;
	options: Option[];
}) {
	const [activateState, activateAction, activatePending] = useActionState(
		activateItemGroupAction,
		null,
	);
	const [inactiveState, inactiveAction, inactivePending] = useActionState(
		inactiveItemGroupAction,
		null,
	);
	const [retireState, retireAction, retirePending] = useActionState(
		retireItemGroupAction,
		null,
	);
	const pending = activatePending || inactivePending || retirePending;
	const draft = options.filter((row) => row.status === "draft");
	const active = options.filter((row) => row.status === "active");
	const inactive = options.filter((row) => row.status === "inactive");
	const retireable = [...draft, ...active, ...inactive];
	return (
		<LifecycleShell
			canManage={canManage}
			title={title}
			lastOk={
				activateState?.ok === true ||
				inactiveState?.ok === true ||
				retireState?.ok === true
			}
			lastError={
				(activateState?.ok === false && activateState.message) ||
				(inactiveState?.ok === false && inactiveState.message) ||
				(retireState?.ok === false && retireState.message) ||
				null
			}
		>
			<form action={activateAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={draft}
					disabled={pending}
					fieldId="itemGroup-activate"
					label={`Activate ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || draft.length === 0}>
					{activatePending ? <Spinner /> : null}
					Activate
				</Button>
			</form>
			<form action={inactiveAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={active}
					disabled={pending}
					fieldId="itemGroup-inactive"
					label={`Inactive ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || active.length === 0}>
					{inactivePending ? <Spinner /> : null}
					Set inactive
				</Button>
			</form>
			<form action={retireAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={retireable}
					disabled={pending}
					fieldId="itemGroup-retire"
					label={`Retire ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || retireable.length === 0}>
					{retirePending ? <Spinner /> : null}
					Retire
				</Button>
			</form>
		</LifecycleShell>
	);
}

function WarehouseLifecycleControls({
	canManage,
	title,
	options,
}: {
	canManage: boolean;
	title: string;
	options: Option[];
}) {
	const [activateState, activateAction, activatePending] = useActionState(
		activateWarehouseAction,
		null,
	);
	const [inactiveState, inactiveAction, inactivePending] = useActionState(
		inactiveWarehouseAction,
		null,
	);
	const [retireState, retireAction, retirePending] = useActionState(
		retireWarehouseAction,
		null,
	);
	const pending = activatePending || inactivePending || retirePending;
	const draft = options.filter((row) => row.status === "draft");
	const active = options.filter((row) => row.status === "active");
	const inactive = options.filter((row) => row.status === "inactive");
	const retireable = [...draft, ...active, ...inactive];
	return (
		<LifecycleShell
			canManage={canManage}
			title={title}
			lastOk={
				activateState?.ok === true ||
				inactiveState?.ok === true ||
				retireState?.ok === true
			}
			lastError={
				(activateState?.ok === false && activateState.message) ||
				(inactiveState?.ok === false && inactiveState.message) ||
				(retireState?.ok === false && retireState.message) ||
				null
			}
		>
			<form action={activateAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={draft}
					disabled={pending}
					fieldId="warehouse-activate"
					label={`Activate ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || draft.length === 0}>
					{activatePending ? <Spinner /> : null}
					Activate
				</Button>
			</form>
			<form action={inactiveAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={active}
					disabled={pending}
					fieldId="warehouse-inactive"
					label={`Inactive ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || active.length === 0}>
					{inactivePending ? <Spinner /> : null}
					Set inactive
				</Button>
			</form>
			<form action={retireAction} className="flex flex-col gap-2">
				<VersionedSelect
					name="id"
					options={retireable}
					disabled={pending}
					fieldId="warehouse-retire"
					label={`Retire ${title.toLowerCase()}`}
				/>
				<input type="hidden" name="expectedVersion" defaultValue={1} />
				<Button type="submit" disabled={pending || retireable.length === 0}>
					{retirePending ? <Spinner /> : null}
					Retire
				</Button>
			</form>
		</LifecycleShell>
	);
}

/**
 * Activate / inactive / retire controls for item, item-group, warehouse roots.
 */
export function MasterRootLifecycleForm({
	canManage,
	entity,
	options,
	title,
}: {
	canManage: boolean;
	entity: "item" | "itemGroup" | "warehouse";
	options: Option[];
	title: string;
}) {
	switch (entity) {
		case "item":
			return (
				<ItemLifecycleControls
					canManage={canManage}
					title={title}
					options={options}
				/>
			);
		case "itemGroup":
			return (
				<ItemGroupLifecycleControls
					canManage={canManage}
					title={title}
					options={options}
				/>
			);
		case "warehouse":
			return (
				<WarehouseLifecycleControls
					canManage={canManage}
					title={title}
					options={options}
				/>
			);
		default: {
			const _exhaustive: never = entity;
			return _exhaustive;
		}
	}
}
