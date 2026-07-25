import type { CaCompanyStatus } from "../schemas";

export const ALLOWED_COMPANY_STATUS_TRANSITIONS: Readonly<
	Record<CaCompanyStatus, readonly CaCompanyStatus[]>
> = {
	draft: ["active", "archived"],
	active: ["suspended", "dissolved"],
	suspended: ["active", "dissolved"],
	dissolved: ["archived"],
	archived: [],
};

export function isAllowedCompanyStatusTransition(
	from: CaCompanyStatus,
	to: CaCompanyStatus,
): boolean {
	return ALLOWED_COMPANY_STATUS_TRANSITIONS[from].includes(to);
}
