"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	createItemVariant,
	ITEM_TYPES,
	type ItemVariant,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateItemVariantActionData = {
	variant: ItemVariant;
};

export type CreateItemVariantActionState =
	ActionResult<CreateItemVariantActionData> | null;

const createItemVariantFormSchema = z.object({
	templateId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	itemType: z.enum(ITEM_TYPES),
	baseUomId: z.string().uuid(),
	itemGroupId: z.string().uuid(),
});

const attributeIdSchema = z.string().uuid();

type AttributeValueInput =
	| { attributeId: string; optionId: string }
	| { attributeId: string; valueText: string };

function parseAttributeValues(
	formData: FormData,
):
	| { ok: true; values: AttributeValueInput[] }
	| { ok: false; message: string } {
	const rawIds = formData.getAll("attributeIds");
	const attributeIds: string[] = [];
	for (const raw of rawIds) {
		if (typeof raw !== "string") {
			continue;
		}
		const parsedId = attributeIdSchema.safeParse(raw);
		if (!parsedId.success) {
			return { ok: false, message: "One or more attribute ids are invalid." };
		}
		attributeIds.push(parsedId.data);
	}
	if (attributeIds.length === 0) {
		return {
			ok: false,
			message: "Select a template with at least one attribute value.",
		};
	}

	const values: AttributeValueInput[] = [];
	for (const attributeId of attributeIds) {
		const optionRaw = formData.get(`optionId_${attributeId}`);
		const textRaw = formData.get(`valueText_${attributeId}`);
		const optionId =
			typeof optionRaw === "string" && optionRaw.trim().length > 0
				? optionRaw.trim()
				: undefined;
		const valueText =
			typeof textRaw === "string" && textRaw.trim().length > 0
				? textRaw.trim()
				: undefined;
		const hasOption = optionId !== undefined;
		const hasText = valueText !== undefined;
		if (hasOption === hasText) {
			return {
				ok: false,
				message:
					"Each template attribute needs exactly one of option or text value.",
			};
		}
		if (optionId !== undefined) {
			const optionParsed = attributeIdSchema.safeParse(optionId);
			if (!optionParsed.success) {
				return { ok: false, message: "One or more option ids are invalid." };
			}
			values.push({ attributeId, optionId: optionParsed.data });
			continue;
		}
		if (valueText === undefined) {
			return {
				ok: false,
				message:
					"Each template attribute needs exactly one of option or text value.",
			};
		}
		values.push({ attributeId, valueText });
	}
	return { ok: true, values };
}

/**
 * Concrete variant item create — own md_item id+code + typed attribute values.
 * Form posts one value per template attribute (option_* or valueText_*).
 */
export async function createItemVariantAction(
	_prev: CreateItemVariantActionState,
	formData: FormData,
): Promise<CreateItemVariantActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(createItemVariantFormSchema, {
		templateId: formData.get("templateId"),
		code: formData.get("code"),
		name: formData.get("name"),
		itemType: formData.get("itemType"),
		baseUomId: formData.get("baseUomId"),
		itemGroupId: formData.get("itemGroupId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid variant code, template, and item group.",
			parsed.details,
		);
	}

	const attributeValues = parseAttributeValues(formData);
	if (!attributeValues.ok) {
		return actionFail("VALIDATION_ERROR", attributeValues.message);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await createItemVariant(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				templateId: parsed.data.templateId,
				code: parsed.data.code,
				name: parsed.data.name,
				itemType: parsed.data.itemType,
				baseUomId: parsed.data.baseUomId,
				itemGroupId: parsed.data.itemGroupId,
				attributeValues: attributeValues.values,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { variant: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createItemVariantAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not create item variant. Try again or contact an admin.",
			correlationId,
		);
	}
}
