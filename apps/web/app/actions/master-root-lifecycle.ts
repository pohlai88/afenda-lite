"use server";

import type { Result } from "@afenda/errors/result";
import {
	activateItem,
	activateItemGroup,
	activateWarehouse,
	inactiveItem,
	inactiveItemGroup,
	inactiveWarehouse,
	type Item,
	type ItemGroup,
	type MasterCommandOptions,
	retireItem,
	retireItemGroup,
	retireWarehouse,
	type Warehouse,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const lifecycleFormSchema = z.object({
	id: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

type LifecycleKind = "activate" | "inactive" | "retire";

type LifecycleCommand<TEntity> = (
	payload: unknown,
	options?: MasterCommandOptions,
) => Promise<Result<TEntity>>;

async function runRootLifecycle<TEntity, TData extends Record<string, unknown>>(input: {
	kind: LifecycleKind;
	entityLabel: string;
	path: string;
	formData: FormData;
	command: LifecycleCommand<TEntity>;
	toData: (entity: TEntity) => TData;
}): Promise<ActionResult<TData> | null> {
	const parsed = parseSchema(lifecycleFormSchema, {
		id: input.formData.get("id"),
		expectedVersion: input.formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			`Provide a valid ${input.entityLabel} id and expected version.`,
			parsed.details,
		);
	}
	return runMemberPermissionAction({
		path: input.path,
		permission: "master_data.manage",
		safeMessage: `Could not ${input.kind} ${input.entityLabel}. Try again or contact an admin.`,
		execute: async (session, correlationId) => {
			const result = await input.command(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					id: parsed.data.id,
					expectedVersion: parsed.data.expectedVersion,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
			return { ok: true, data: input.toData(mapped.data) };
		},
	});
}

export type ItemLifecycleActionState = ActionResult<{ item: Item }> | null;
export type ItemGroupLifecycleActionState =
	ActionResult<{ itemGroup: ItemGroup }> | null;
export type WarehouseLifecycleActionState =
	ActionResult<{ warehouse: Warehouse }> | null;

export async function activateItemAction(
	_prev: ItemLifecycleActionState,
	formData: FormData,
): Promise<ItemLifecycleActionState> {
	return runRootLifecycle({
		kind: "activate",
		entityLabel: "item",
		path: "activateItemAction",
		formData,
		command: activateItem,
		toData: (item) => ({ item }),
	});
}

export async function inactiveItemAction(
	_prev: ItemLifecycleActionState,
	formData: FormData,
): Promise<ItemLifecycleActionState> {
	return runRootLifecycle({
		kind: "inactive",
		entityLabel: "item",
		path: "inactiveItemAction",
		formData,
		command: inactiveItem,
		toData: (item) => ({ item }),
	});
}

export async function retireItemAction(
	_prev: ItemLifecycleActionState,
	formData: FormData,
): Promise<ItemLifecycleActionState> {
	return runRootLifecycle({
		kind: "retire",
		entityLabel: "item",
		path: "retireItemAction",
		formData,
		command: retireItem,
		toData: (item) => ({ item }),
	});
}

export async function activateItemGroupAction(
	_prev: ItemGroupLifecycleActionState,
	formData: FormData,
): Promise<ItemGroupLifecycleActionState> {
	return runRootLifecycle({
		kind: "activate",
		entityLabel: "item group",
		path: "activateItemGroupAction",
		formData,
		command: activateItemGroup,
		toData: (itemGroup) => ({ itemGroup }),
	});
}

export async function inactiveItemGroupAction(
	_prev: ItemGroupLifecycleActionState,
	formData: FormData,
): Promise<ItemGroupLifecycleActionState> {
	return runRootLifecycle({
		kind: "inactive",
		entityLabel: "item group",
		path: "inactiveItemGroupAction",
		formData,
		command: inactiveItemGroup,
		toData: (itemGroup) => ({ itemGroup }),
	});
}

export async function retireItemGroupAction(
	_prev: ItemGroupLifecycleActionState,
	formData: FormData,
): Promise<ItemGroupLifecycleActionState> {
	return runRootLifecycle({
		kind: "retire",
		entityLabel: "item group",
		path: "retireItemGroupAction",
		formData,
		command: retireItemGroup,
		toData: (itemGroup) => ({ itemGroup }),
	});
}

export async function activateWarehouseAction(
	_prev: WarehouseLifecycleActionState,
	formData: FormData,
): Promise<WarehouseLifecycleActionState> {
	return runRootLifecycle({
		kind: "activate",
		entityLabel: "warehouse",
		path: "activateWarehouseAction",
		formData,
		command: activateWarehouse,
		toData: (warehouse) => ({ warehouse }),
	});
}

export async function inactiveWarehouseAction(
	_prev: WarehouseLifecycleActionState,
	formData: FormData,
): Promise<WarehouseLifecycleActionState> {
	return runRootLifecycle({
		kind: "inactive",
		entityLabel: "warehouse",
		path: "inactiveWarehouseAction",
		formData,
		command: inactiveWarehouse,
		toData: (warehouse) => ({ warehouse }),
	});
}

export async function retireWarehouseAction(
	_prev: WarehouseLifecycleActionState,
	formData: FormData,
): Promise<WarehouseLifecycleActionState> {
	return runRootLifecycle({
		kind: "retire",
		entityLabel: "warehouse",
		path: "retireWarehouseAction",
		formData,
		command: retireWarehouse,
		toData: (warehouse) => ({ warehouse }),
	});
}
