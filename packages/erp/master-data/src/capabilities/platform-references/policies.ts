import { ok, type Result } from "@afenda/errors/result";
import {
	failInactiveReference,
	failReferenceDimensionMismatch,
	failReferenceNotFound,
} from "./reference-errors";
import type {
	RefCountryId,
	RefCurrencyId,
	RefLanguageId,
	RefTimeZoneId,
	RefUomDimensionId,
	RefUomId,
} from "./schemas";
import type { PlatformReferenceStore } from "./store";
import {
	type RefCountry,
	type RefCurrency,
	type RefLanguage,
	type RefTimeZone,
	type RefUom,
	type RefUomDimension,
	type UomDimensionCompatibilityInput,
	uomConversionDirection,
} from "./types";

function requireActiveReference<TReference extends { active: boolean }>(
	reference: TReference | null,
	referenceFamily: string,
): Result<TReference> {
	if (reference === null) return failReferenceNotFound(referenceFamily);
	if (!reference.active) return failInactiveReference(referenceFamily);
	return ok(reference);
}

export async function resolveActiveCountry(
	store: Pick<PlatformReferenceStore, "getCountryById">,
	id: RefCountryId,
): Promise<Result<RefCountry>> {
	return requireActiveReference(await store.getCountryById(id), "country");
}

export async function resolveActiveCurrency(
	store: Pick<PlatformReferenceStore, "getCurrencyById">,
	id: RefCurrencyId,
): Promise<Result<RefCurrency>> {
	return requireActiveReference(await store.getCurrencyById(id), "currency");
}

export async function resolveActiveLanguage(
	store: Pick<PlatformReferenceStore, "getLanguageById">,
	id: RefLanguageId,
): Promise<Result<RefLanguage>> {
	return requireActiveReference(await store.getLanguageById(id), "language");
}

export async function resolveActiveTimeZone(
	store: Pick<PlatformReferenceStore, "getTimeZoneById">,
	id: RefTimeZoneId,
): Promise<Result<RefTimeZone>> {
	return requireActiveReference(await store.getTimeZoneById(id), "time_zone");
}

export async function resolveUomDimension(
	store: Pick<PlatformReferenceStore, "getUomDimensionById">,
	id: RefUomDimensionId,
): Promise<Result<RefUomDimension>> {
	const reference = await store.getUomDimensionById(id);
	return reference === null
		? failReferenceNotFound("uom_dimension")
		: ok(reference);
}

export async function resolveActiveUom(
	store: Pick<PlatformReferenceStore, "getUomById">,
	id: RefUomId,
): Promise<Result<RefUom>> {
	return requireActiveReference(await store.getUomById(id), "uom");
}

export function validateItemUomCompatibility(
	input: UomDimensionCompatibilityInput,
): Result<{ direction: typeof uomConversionDirection }> {
	if (input.baseUom.dimensionId === input.alternateUom.dimensionId) {
		return ok({ direction: uomConversionDirection });
	}
	if (
		input.policy === "item_governed_packaging" &&
		input.isApprovedPackagingOrCountConversion === true
	) {
		return ok({ direction: uomConversionDirection });
	}
	return failReferenceDimensionMismatch();
}
