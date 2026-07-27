import {
	ITEM_TRACKING_POLICIES,
	type Item,
	type ItemGroup,
	type ItemTrackingPolicy,
	type ItemType,
	MASTER_STATUSES,
	type MasterStatus,
	PAYMENT_TERM_DUE_DAY_RULES,
	PAYMENT_TERM_INSTALLMENT_POLICIES,
	type Party,
	type PartyKind,
	type PaymentTerm,
	type PaymentTermDueDayRule,
	type PaymentTermInstallmentPolicy,
	type RefCountry,
	type RefCurrency,
	type RefLanguage,
	type RefTimeZone,
	type RefUom,
	type RefUomDimension,
	TAX_REGISTRATION_TYPES,
	type TaxRegistration,
	type TaxRegistrationType,
	type Warehouse,
	type WarehouseLocationType,
} from "../../types";
import {
	countryCodeSchema,
	currencyCodeSchema,
	languageCodeSchema,
	refCountryIdSchema,
	refCurrencyIdSchema,
	refLanguageIdSchema,
	refTimeZoneIdSchema,
	refUomDimensionIdSchema,
	refUomIdSchema,
	timeZoneCodeSchema,
	uomCodeSchema,
	uomDimensionCodeSchema,
} from "../platform-references/schemas";

function asKnownMasterStatus(status: string): MasterStatus {
	for (const known of MASTER_STATUSES) {
		if (known === status) {
			return known;
		}
	}
	throw new Error(`Unexpected master status from store: ${status}`);
}

function asKnownTaxRegistrationType(value: string): TaxRegistrationType {
	for (const known of TAX_REGISTRATION_TYPES) {
		if (known === value) {
			return known;
		}
	}
	throw new Error(`Unexpected tax registration type from store: ${value}`);
}

function asKnownItemTrackingPolicy(value: string): ItemTrackingPolicy {
	for (const known of ITEM_TRACKING_POLICIES) {
		if (known === value) {
			return known;
		}
	}
	throw new Error(`Unexpected item tracking policy from store: ${value}`);
}

function asKnownPaymentTermDueDayRule(value: string): PaymentTermDueDayRule {
	for (const known of PAYMENT_TERM_DUE_DAY_RULES) {
		if (known === value) {
			return known;
		}
	}
	throw new Error(`Unexpected payment term due-day rule from store: ${value}`);
}

function asKnownPaymentTermInstallmentPolicy(
	value: string,
): PaymentTermInstallmentPolicy {
	for (const known of PAYMENT_TERM_INSTALLMENT_POLICIES) {
		if (known === value) {
			return known;
		}
	}
	throw new Error(
		`Unexpected payment term installment policy from store: ${value}`,
	);
}

export function mapRefCountry(row: {
	id: string;
	code: string;
	alpha3: string;
	name: string;
	active: boolean;
}): RefCountry {
	return {
		id: refCountryIdSchema.parse(row.id),
		code: countryCodeSchema.parse(row.code),
		alpha3: row.alpha3,
		name: row.name,
		active: row.active,
	};
}

export function mapRefCurrency(row: {
	id: string;
	code: string;
	name: string;
	minorUnits: number;
	active: boolean;
}): RefCurrency {
	return {
		id: refCurrencyIdSchema.parse(row.id),
		code: currencyCodeSchema.parse(row.code),
		name: row.name,
		minorUnits: row.minorUnits,
		active: row.active,
	};
}

export function mapRefLanguage(row: {
	id: string;
	code: string;
	name: string;
	active: boolean;
}): RefLanguage {
	return {
		id: refLanguageIdSchema.parse(row.id),
		code: languageCodeSchema.parse(row.code),
		name: row.name,
		active: row.active,
	};
}

export function mapRefTimeZone(row: {
	id: string;
	ianaName: string;
	name: string;
	active: boolean;
}): RefTimeZone {
	return {
		id: refTimeZoneIdSchema.parse(row.id),
		ianaName: timeZoneCodeSchema.parse(row.ianaName),
		name: row.name,
		active: row.active,
	};
}

export function mapRefUomDimension(row: {
	id: string;
	code: string;
	name: string;
}): RefUomDimension {
	return {
		id: refUomDimensionIdSchema.parse(row.id),
		code: uomDimensionCodeSchema.parse(row.code),
		name: row.name,
	};
}

export function mapRefUom(row: {
	id: string;
	code: string;
	name: string;
	symbol: string;
	dimensionId: string;
	toBaseNumerator: string;
	toBaseDenominator: string;
	isBase: boolean;
	active: boolean;
}): RefUom {
	return {
		id: refUomIdSchema.parse(row.id),
		code: uomCodeSchema.parse(row.code),
		name: row.name,
		symbol: row.symbol,
		dimensionId: refUomDimensionIdSchema.parse(row.dimensionId),
		toBaseNumerator: String(row.toBaseNumerator),
		toBaseDenominator: String(row.toBaseDenominator),
		isBase: row.isBase,
		active: row.active,
	};
}

export function mapParty(row: {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	partyKind: string;
	status: string;
	version: number;
	legalName: string | null;
	tradingName: string | null;
	registrationNumber: string | null;
	registrationCountryId: string | null;
	preferredLanguageId: string | null;
	defaultCurrencyId: string | null;
	mergedIntoId: string | null;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	blockedAt: Date | null;
	blockedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): Party {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		partyKind: row.partyKind as PartyKind,
		status: row.status as MasterStatus,
		version: row.version,
		legalName: row.legalName,
		tradingName: row.tradingName,
		registrationNumber: row.registrationNumber,
		registrationCountryId: row.registrationCountryId,
		preferredLanguageId: row.preferredLanguageId,
		defaultCurrencyId: row.defaultCurrencyId,
		mergedIntoId: row.mergedIntoId,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		blockedAt: row.blockedAt,
		blockedBy: row.blockedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function mapItemGroup(row: {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	parentId: string | null;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): ItemGroup {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		parentId: row.parentId,
		status: row.status as MasterStatus,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function mapItem(row: {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	itemType: string;
	description?: string | null;
	status: string;
	version: number;
	baseUomId: string;
	itemGroupId: string;
	trackingPolicy?: string;
	sellable?: boolean;
	purchasable?: boolean;
	stocked?: boolean;
	serviceIndicator?: boolean;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): Item {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		itemType: row.itemType as ItemType,
		description: row.description ?? null,
		status: row.status as MasterStatus,
		version: row.version,
		baseUomId: row.baseUomId,
		itemGroupId: row.itemGroupId,
		trackingPolicy: asKnownItemTrackingPolicy(row.trackingPolicy ?? "none"),
		sellable: row.sellable ?? true,
		purchasable: row.purchasable ?? true,
		stocked: row.stocked ?? row.itemType === "stock",
		serviceIndicator: row.serviceIndicator ?? row.itemType === "service",
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function mapWarehouse(row: {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	locationType: string;
	parentId: string | null;
	addressCountryId?: string | null;
	addressLine1?: string | null;
	addressLine2?: string | null;
	addressCity?: string | null;
	addressRegion?: string | null;
	addressPostalCode?: string | null;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): Warehouse {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		locationType: row.locationType as WarehouseLocationType,
		parentId: row.parentId,
		addressCountryId: row.addressCountryId ?? null,
		addressLine1: row.addressLine1 ?? null,
		addressLine2: row.addressLine2 ?? null,
		addressCity: row.addressCity ?? null,
		addressRegion: row.addressRegion ?? null,
		addressPostalCode: row.addressPostalCode ?? null,
		status: row.status as MasterStatus,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function mapPaymentTerm(row: {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	name: string;
	netDays: number;
	discountDays?: number | null;
	discountPercent?: string | null;
	dueDayRule?: string;
	endOfMonth?: boolean;
	installmentPolicy?: string;
	installmentCount?: number | null;
	validFrom?: Date | null;
	validTo?: Date | null;
	currencyRestrictionId?: string | null;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): PaymentTerm {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		netDays: row.netDays,
		discountDays: row.discountDays ?? null,
		discountPercent: row.discountPercent ?? null,
		dueDayRule: asKnownPaymentTermDueDayRule(row.dueDayRule ?? "net_days"),
		endOfMonth: row.endOfMonth ?? false,
		installmentPolicy: asKnownPaymentTermInstallmentPolicy(
			row.installmentPolicy ?? "none",
		),
		installmentCount: row.installmentCount ?? null,
		validFrom: row.validFrom ?? null,
		validTo: row.validTo ?? null,
		currencyRestrictionId: row.currencyRestrictionId ?? null,
		status: row.status as MasterStatus,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function mapTaxRegistration(row: {
	id: string;
	organizationId: string;
	partyId: string;
	jurisdictionCountryId: string;
	registrationType: string;
	registrationNumber: string;
	normalizedRegistrationNumber: string;
	name: string | null;
	status: string;
	version: number;
	validFrom: Date | null;
	validTo: Date | null;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	blockedAt: Date | null;
	blockedBy: string | null;
	retiredAt: Date | null;
	retiredBy: string | null;
	deletedAt: Date | null;
	deletedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}): TaxRegistration {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		jurisdictionCountryId: row.jurisdictionCountryId,
		registrationType: asKnownTaxRegistrationType(row.registrationType),
		registrationNumber: row.registrationNumber,
		normalizedRegistrationNumber: row.normalizedRegistrationNumber,
		name: row.name,
		status: asKnownMasterStatus(row.status),
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		blockedAt: row.blockedAt,
		blockedBy: row.blockedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		deletedAt: row.deletedAt,
		deletedBy: row.deletedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
