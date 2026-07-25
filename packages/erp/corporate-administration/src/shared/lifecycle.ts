import type { CaLegalCompanyStatus } from "../schemas";

export const CA_LEGAL_COMPANY_TRANSITIONS = {
	draft: ["active", "archived"],
	active: ["suspended", "dissolved"],
	suspended: ["active", "dissolved"],
	dissolved: ["archived"],
	archived: [],
} as const satisfies Record<
	CaLegalCompanyStatus,
	readonly CaLegalCompanyStatus[]
>;

export function canTransitionLegalCompany(
	from: CaLegalCompanyStatus,
	to: CaLegalCompanyStatus,
): boolean {
	const allowed: readonly CaLegalCompanyStatus[] =
		CA_LEGAL_COMPANY_TRANSITIONS[from];
	return allowed.includes(to);
}

export function isTerminalLegalCompanyStatus(
	status: CaLegalCompanyStatus,
): boolean {
	return status === "dissolved" || status === "archived";
}

export function canUpdateLegalCompanyProfile(
	status: CaLegalCompanyStatus,
): boolean {
	return (
		status === "draft" || status === "active" || status === "suspended"
	);
}
