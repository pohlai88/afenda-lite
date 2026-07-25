import type {
	CaCompanyActivationReadiness,
	CaCompanyIdentifier,
	CaCompanyName,
	CaLegalCompanyDetail,
} from "../schemas";

import { isRegistrationIdentifierType } from "./code";
import { isEffectiveOnDate } from "./effective-range";

export function isEffectivePrimaryLegalName(
	name: CaCompanyName,
	effectiveDate: string,
): boolean {
	return (
		name.nameType === "legal" &&
		name.isPrimary &&
		isEffectiveOnDate(name, effectiveDate)
	);
}

export function isEffectivePrimaryRegistrationIdentifier(
	identifier: CaCompanyIdentifier,
	effectiveDate: string,
): boolean {
	return (
		identifier.status === "active" &&
		identifier.isPrimary &&
		isRegistrationIdentifierType(identifier.identifierType) &&
		isEffectiveOnDate(identifier, effectiveDate)
	);
}

export function evaluateCompanyActivationReadiness(input: {
	detail: CaLegalCompanyDetail;
	effectiveDate: string;
	legalEntityEffective: boolean;
	partyActiveOrganization: boolean;
}): CaCompanyActivationReadiness {
	const missing: CaCompanyActivationReadiness["missing"][number][] = [];

	if (!input.legalEntityEffective) {
		missing.push("effective_legal_entity_dimension");
	}
	if (!input.partyActiveOrganization) {
		missing.push("active_organization_party");
	}

	const primaryLegalNames = input.detail.names.filter((name) =>
		isEffectivePrimaryLegalName(name, input.effectiveDate),
	);
	if (primaryLegalNames.length !== 1) {
		missing.push("primary_legal_name");
	}

	const primaryRegistrationIdentifiers = input.detail.identifiers.filter(
		(identifier) =>
			isEffectivePrimaryRegistrationIdentifier(
				identifier,
				input.effectiveDate,
			),
	);
	if (primaryRegistrationIdentifiers.length !== 1) {
		missing.push("primary_registration_identifier");
	}

	return {
		ready: missing.length === 0,
		missing,
	};
}
