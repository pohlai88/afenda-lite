import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type { LifecycleRecord, ListFilter } from "./store";
import type {
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeOption,
	ItemTemplateAttributeValueKind,
	ItemType,
	ItemVariant,
	MasterStatus,
} from "./types";

export type ItemTemplateCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	createdBy: string;
};

export type ItemTemplateUpdateRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	updatedBy: string;
	name?: string;
};

export type ItemTemplateAttributeCreateRecord = {
	organizationId: string;
	templateId: string;
	code: string;
	normalizedCode: string;
	name: string;
	valueKind: ItemTemplateAttributeValueKind;
	isRequired: boolean;
	sortOrder: number;
	createdBy: string;
};

export type ItemTemplateAttributeOptionCreateRecord = {
	organizationId: string;
	attributeId: string;
	code: string;
	normalizedCode: string;
	label: string;
	sortOrder: number;
	createdBy: string;
};

export type ItemVariantAttributeValueCreateRecord = {
	attributeId: string;
	valueText: string | null;
	optionId: string | null;
	normalizedValue: string;
};

export type ItemVariantCreateRecord = {
	organizationId: string;
	templateId: string;
	code: string;
	normalizedCode: string;
	name: string;
	itemType: ItemType;
	baseUomId: string;
	itemGroupId: string;
	combinationKey: string;
	attributeValues: ItemVariantAttributeValueCreateRecord[];
	createdBy: string;
};

export type ListItemVariantsFilter = ListFilter & {
	templateId: string;
};

/** Persistence port for item templates / concrete variants. */
export type MasterDataVariantStore = {
	getItemTemplateById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemTemplate | null>>;
	getItemTemplateByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemTemplate | null>>;
	listItemTemplates(filter: ListFilter): Promise<Result<ItemTemplate[]>>;
	createItemTemplate(
		record: ItemTemplateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplate>>;
	updateItemTemplate(
		record: ItemTemplateUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplate>>;
	transitionItemTemplate(
		record: LifecycleRecord,
		ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
	): Promise<Result<ItemTemplate>>;

	listItemTemplateAttributes(
		organizationId: string,
		templateId: string,
	): Promise<Result<ItemTemplateAttribute[]>>;
	listItemTemplateAttributeOptions(
		organizationId: string,
		attributeId: string,
	): Promise<Result<ItemTemplateAttributeOption[]>>;
	addItemTemplateAttribute(
		record: ItemTemplateAttributeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplateAttribute>>;
	addItemTemplateAttributeOption(
		record: ItemTemplateAttributeOptionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemTemplateAttributeOption>>;

	getItemVariantById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemVariant | null>>;
	listItemVariantsByTemplate(
		filter: ListItemVariantsFilter,
	): Promise<Result<ItemVariant[]>>;
	createItemVariant(
		record: ItemVariantCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemVariant>>;
};

export type { MasterStatus };
