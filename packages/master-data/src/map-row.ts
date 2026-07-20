import {
	type Item,
	type ItemGroup,
	type ItemType,
	MASTER_STATUSES,
	type MasterStatus,
	type Party,
	type PartyKind,
	type PaymentTerm,
	type RefCountry,
	type RefCurrency,
	type RefLanguage,
	type RefTimeZone,
	type RefUom,
	type RefUomDimension,
	TAX_REGISTRATION_TYPES,
	type TaxRegistration,
	type TaxRegistrationType,
	type UomDimensionCode,
	type Warehouse,
	type WarehouseLocationType,
} from "./types";

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

export function mapRefCountry(row: {
	id: string;
	code: string;
	alpha3: string;
	name: string;
	active: boolean;
}): RefCountry {
	return {
		id: row.id,
		code: row.code,
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
		id: row.id,
		code: row.code,
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
		id: row.id,
		code: row.code,
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
		id: row.id,
		ianaName: row.ianaName,
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
		id: row.id,
		code: row.code as UomDimensionCode,
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
		id: row.id,
		code: row.code,
		name: row.name,
		symbol: row.symbol,
		dimensionId: row.dimensionId,
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
	status: string;
	version: number;
	baseUomId: string;
	itemGroupId: string;
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
		status: row.status as MasterStatus,
		version: row.version,
		baseUomId: row.baseUomId,
		itemGroupId: row.itemGroupId,
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
