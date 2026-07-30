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
} from "../../types";
import type { ItemTemplateLifecycleEventSuffix } from "../core-organization-masters/core-master-events";
import type {
	LifecycleRecord,
	ListFilter,
} from "../core-organization-masters/store";

export interface ItemTemplateCreateRecord {
	code: string;
	createdBy: string;
	name: string;
	normalizedCode: string;
	organizationId: string;
}

export interface ItemTemplateUpdateRecord {
	expectedVersion: number;
	id: string;
	name?: string | undefined;
	organizationId: string;
	updatedBy: string;
}

export interface ItemTemplateAttributeCreateRecord {
	code: string;
	createdBy: string;
	dataType: ItemTemplateAttributeDataType;
	description: string | null;
	displayOrder: number;
	isRequired: boolean;
	isSearchable: boolean;
	isVariantDefining: boolean;
	name: string;
	normalizedCode: string;
	organizationId: string;
	templateId: string;
	validationRules: ItemTemplateAttributeValidationRules;
}

export interface ItemTemplateAttributeOptionCreateRecord {
	attributeId: string;
	code: string;
	createdBy: string;
	description: string | null;
	displayOrder: number;
	label: string;
	normalizedCode: string;
	organizationId: string;
}

export interface ItemTemplateAttributeContext {
	attribute: ItemTemplateAttribute;
	template: ItemTemplate;
}

export interface ItemVariantAttributeValueCreateRecord {
	attributeId: string;
	booleanValue: boolean | null;
	dateValue: string | null;
	decimalValue: string | null;
	integerValue: string | null;
	normalizedValue: string;
	optionId: string | null;
	optionIds: readonly string[];
	referenceValue: string | null;
	textValue: string | null;
	valueType: ItemTemplateAttributeDataType;
}

export interface ItemVariantCreateRecord {
	attributeValues: ItemVariantAttributeValueCreateRecord[];
	baseUomId: string;
	code: string;
	combinationKey: string;
	createdBy: string;
	itemGroupId: string;
	itemType: ItemType;
	name: string;
	normalizedCode: string;
	organizationId: string;
	templateId: string;
}

export type ItemTemplateLifecycleRecord = Omit<LifecycleRecord, "toStatus"> & {
	toStatus: "active" | "inactive" | "retired";
};

export interface ItemVariantRetireRecord {
	actorUserId: string;
	expectedItemVersion: number;
	expectedVariantVersion: number;
	itemId: string;
	organizationId: string;
	variantId: string;
}

export type ListItemVariantsFilter = ListFilter & {
	templateId: string;
};

/** Item-variant and template-owned child persistence boundary. */
export interface ItemVariantExtensionStore {
	addItemTemplateAttribute: (
		record: ItemTemplateAttributeCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemTemplateAttribute>>;
	addItemTemplateAttributeOption: (
		record: ItemTemplateAttributeOptionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemTemplateAttributeOption>>;
	createItemTemplate: (
		record: ItemTemplateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemTemplate>>;
	createItemVariant: (
		record: ItemVariantCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemVariant>>;
	getItemTemplateAttributeContextById: (
		organizationId: string,
		attributeId: string,
	) => Promise<Result<ItemTemplateAttributeContext | null>>;
	getItemTemplateByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<ItemTemplate | null>>;
	getItemTemplateById: (
		organizationId: string,
		id: string,
	) => Promise<Result<ItemTemplate | null>>;

	getItemVariantById: (
		organizationId: string,
		id: string,
	) => Promise<Result<ItemVariant | null>>;
	listItemTemplateAttributeOptions: (
		organizationId: string,
		attributeId: string,
	) => Promise<Result<ItemTemplateAttributeOption[]>>;
	listItemTemplateAttributeOptionsByTemplate: (
		organizationId: string,
		templateId: string,
	) => Promise<Result<ItemTemplateAttributeOption[]>>;

	listItemTemplateAttributes: (
		organizationId: string,
		templateId: string,
	) => Promise<Result<ItemTemplateAttribute[]>>;
	listItemTemplates: (filter: ListFilter) => Promise<Result<ItemTemplate[]>>;
	listItemVariantsByTemplate: (
		filter: ListItemVariantsFilter,
	) => Promise<Result<ItemVariant[]>>;
	retireItemVariant: (
		record: ItemVariantRetireRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemVariant>>;
	transitionItemTemplate: (
		record: ItemTemplateLifecycleRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemTemplateLifecycleEventSuffix;
		},
	) => Promise<Result<ItemTemplate>>;
	updateItemTemplate: (
		record: ItemTemplateUpdateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ItemTemplate>>;
}

/** Backward-compatible names retained for existing package consumers. */
export type MasterDataVariantStore = ItemVariantExtensionStore;
export type ItemTemplateVariantStore = ItemVariantExtensionStore;

export type { MasterStatus } from "../../types";
