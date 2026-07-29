import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "../../ports";
import type {
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeDataType,
	ItemTemplateAttributeOption,
	ItemTemplateAttributeValidationRules,
	ItemType,
	ItemVariant,
	MasterStatus,
} from "../../types";
import type { ItemTemplateLifecycleEventSuffix } from "../core-organization-masters/core-master-events";
import type {
	LifecycleRecord,
	ListFilter,
} from "../core-organization-masters/store";

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
	name?: string | undefined;
};

export type ItemTemplateAttributeCreateRecord = {
	organizationId: string;
	templateId: string;
	code: string;
	normalizedCode: string;
	name: string;
	description: string | null;
	dataType: ItemTemplateAttributeDataType;
	isRequired: boolean;
	isVariantDefining: boolean;
	isSearchable: boolean;
	displayOrder: number;
	validationRules: ItemTemplateAttributeValidationRules;
	createdBy: string;
};

export type ItemTemplateAttributeOptionCreateRecord = {
	organizationId: string;
	attributeId: string;
	code: string;
	normalizedCode: string;
	label: string;
	description: string | null;
	displayOrder: number;
	createdBy: string;
};

export type ItemTemplateAttributeContext = {
	attribute: ItemTemplateAttribute;
	template: ItemTemplate;
};

export type ItemVariantAttributeValueCreateRecord = {
	attributeId: string;
	valueType: ItemTemplateAttributeDataType;
	textValue: string | null;
	integerValue: string | null;
	decimalValue: string | null;
	booleanValue: boolean | null;
	dateValue: string | null;
	optionId: string | null;
	optionIds: readonly string[];
	referenceValue: string | null;
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

export type ItemTemplateLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export type ItemVariantRetireRecord = {
	organizationId: string;
	variantId: string;
	expectedVariantVersion: number;
	itemId: string;
	expectedItemVersion: number;
	actorUserId: string;
};

export type ListItemVariantsFilter = ListFilter & {
	templateId: string;
};

/** Item-variant and template-owned child persistence boundary. */
export interface ItemVariantExtensionStore {
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
		record: ItemTemplateLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemTemplateLifecycleEventSuffix;
		},
	): Promise<Result<ItemTemplate>>;

	listItemTemplateAttributes(
		organizationId: string,
		templateId: string,
	): Promise<Result<ItemTemplateAttribute[]>>;
	getItemTemplateAttributeContextById(
		organizationId: string,
		attributeId: string,
	): Promise<Result<ItemTemplateAttributeContext | null>>;
	listItemTemplateAttributeOptions(
		organizationId: string,
		attributeId: string,
	): Promise<Result<ItemTemplateAttributeOption[]>>;
	listItemTemplateAttributeOptionsByTemplate(
		organizationId: string,
		templateId: string,
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
	retireItemVariant(
		record: ItemVariantRetireRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemVariant>>;
}

/** Backward-compatible names retained for existing package consumers. */
export type MasterDataVariantStore = ItemVariantExtensionStore;
export type ItemTemplateVariantStore = ItemVariantExtensionStore;

export type { MasterStatus };
