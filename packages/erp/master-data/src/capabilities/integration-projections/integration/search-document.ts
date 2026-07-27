import type { MasterStatus, WarehouseLocationType } from "../../../types";

export const MASTER_SEARCH_DOCUMENT_ENTITY_TYPES = [
	"party",
	"item",
	"warehouse",
	"organization_dimension",
	"item_group",
	"item_template",
	"item_variant",
] as const;

export type MasterSearchDocumentEntityType =
	(typeof MASTER_SEARCH_DOCUMENT_ENTITY_TYPES)[number];

export const MASTER_SEARCH_PROJECTION_SCHEMA_VERSION = 1 as const;

type MasterSearchDocumentBase<
	TEntityType extends MasterSearchDocumentEntityType,
> = Readonly<{
	organizationId: string;
	entityType: TEntityType;
	entityId: string;
	/**
	 * Equals entityId unless this searchable identity resolves to another
	 * canonical master root through merge or identity canonicalization.
	 */
	canonicalEntityId: string;
	/**
	 * Source aggregate version used to build this document.
	 */
	aggregateVersion: number;
	status: MasterStatus;
	normalizedCode: string | null;
	displayName: string;
	searchTerms: readonly string[];
	projectionSchemaVersion: typeof MASTER_SEARCH_PROJECTION_SCHEMA_VERSION;
	projectedAt: Date;
}>;

export type PartyMasterSearchDocument = MasterSearchDocumentBase<"party"> &
	Readonly<{
		roleCodes: readonly string[];
	}>;

export type ItemMasterSearchDocument = MasterSearchDocumentBase<"item"> &
	Readonly<{
		itemGroupId: string | null;
		barcodeValues: readonly string[];
		aliasValues: readonly string[];
		externalIdTokens: readonly string[];
	}>;

export type WarehouseMasterSearchDocument =
	MasterSearchDocumentBase<"warehouse"> &
		Readonly<{
			warehouseType: WarehouseLocationType;
			externalIdTokens: readonly string[];
		}>;

export type OrganizationDimensionMasterSearchDocument =
	MasterSearchDocumentBase<"organization_dimension">;

export type ItemGroupMasterSearchDocument =
	MasterSearchDocumentBase<"item_group">;

export type ItemTemplateMasterSearchDocument =
	MasterSearchDocumentBase<"item_template">;

export type ItemVariantMasterSearchDocument =
	MasterSearchDocumentBase<"item_variant"> &
		Readonly<{
			templateId: string;
			barcodeValues: readonly string[];
			aliasValues: readonly string[];
			externalIdTokens: readonly string[];
			variantAttributeTokens: readonly string[];
		}>;

export type MasterSearchDocument =
	| PartyMasterSearchDocument
	| ItemMasterSearchDocument
	| WarehouseMasterSearchDocument
	| OrganizationDimensionMasterSearchDocument
	| ItemGroupMasterSearchDocument
	| ItemTemplateMasterSearchDocument
	| ItemVariantMasterSearchDocument;

export type RemoveMasterSearchDocumentInput = Readonly<{
	organizationId: string;
	entityType: MasterSearchDocumentEntityType;
	entityId: string;
	/**
	 * Remove only documents whose aggregateVersion is less than or equal to
	 * this version.
	 */
	removeThroughAggregateVersion: number;
}>;

export function defineMasterSearchDocument<
	const TDocument extends MasterSearchDocument,
>(document: TDocument): TDocument {
	assertNonBlank("organizationId", document.organizationId);
	assertNonBlank("entityId", document.entityId);
	assertNonBlank("canonicalEntityId", document.canonicalEntityId);
	assertPositiveVersion("aggregateVersion", document.aggregateVersion);
	if (document.normalizedCode !== null) {
		assertNonBlank("normalizedCode", document.normalizedCode);
	}
	assertNonBlank("displayName", document.displayName);
	if (
		document.projectionSchemaVersion !== MASTER_SEARCH_PROJECTION_SCHEMA_VERSION
	) {
		throw new Error(
			"projectionSchemaVersion must match the master search schema",
		);
	}
	if (!Number.isFinite(document.projectedAt.getTime())) {
		throw new Error("projectedAt must be a valid date");
	}
	assertNormalizedTokens("searchTerms", document.searchTerms);
	assertEntitySpecificFields(document);
	return document;
}

function assertEntitySpecificFields(document: MasterSearchDocument): void {
	switch (document.entityType) {
		case "party":
			assertNormalizedTokens("roleCodes", document.roleCodes);
			break;
		case "item":
			if (document.itemGroupId !== null) {
				assertNonBlank("itemGroupId", document.itemGroupId);
			}
			assertNormalizedTokens("barcodeValues", document.barcodeValues);
			assertNormalizedTokens("aliasValues", document.aliasValues);
			assertNormalizedTokens("externalIdTokens", document.externalIdTokens);
			break;
		case "warehouse":
			assertNonBlank("warehouseType", document.warehouseType);
			assertNormalizedTokens("externalIdTokens", document.externalIdTokens);
			break;
		case "organization_dimension":
		case "item_group":
		case "item_template":
			break;
		case "item_variant":
			assertNonBlank("templateId", document.templateId);
			assertNormalizedTokens("barcodeValues", document.barcodeValues);
			assertNormalizedTokens("aliasValues", document.aliasValues);
			assertNormalizedTokens("externalIdTokens", document.externalIdTokens);
			assertNormalizedTokens(
				"variantAttributeTokens",
				document.variantAttributeTokens,
			);
			break;
		default:
			assertNever(document);
	}
}

function assertNormalizedTokens(name: string, values: readonly string[]): void {
	const seen = new Set<string>();
	for (const value of values) {
		assertNonBlank(name, value);
		if (value !== value.trim()) {
			throw new Error(
				`${name} entries must not contain surrounding whitespace`,
			);
		}
		if (seen.has(value)) {
			throw new Error(`${name} contains duplicate value: ${value}`);
		}
		seen.add(value);
	}
}

function assertNonBlank(name: string, value: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${name} must not be blank`);
	}
}

function assertPositiveVersion(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unsupported master search document: ${String(value)}`);
}
