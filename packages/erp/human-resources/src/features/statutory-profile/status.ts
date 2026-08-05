import { z } from "zod";

/**
 * D0 statutory-fact capture (`docs/erp/hr-payroll-bridging.md` §D0).
 * HR owns these facts; payroll consumes them through the handoff.
 */
export const STATUTORY_JURISDICTION_CODES = ["MY", "VN"] as const;
export type StatutoryJurisdictionCode =
	(typeof STATUTORY_JURISDICTION_CODES)[number];

export const TAX_RESIDENCY_STATUSES = ["resident", "non_resident"] as const;
export type TaxResidencyStatus = (typeof TAX_RESIDENCY_STATUSES)[number];

/**
 * Vietnam regional minimum-wage zones (I–IV) drive SI/HI/UI contribution caps.
 * HR captures the zone as a work-location-derived employment fact; payroll
 * never derives it (decision recorded in the HR↔Payroll decisions register).
 */
export const REGIONAL_MINIMUM_WAGE_ZONES = ["I", "II", "III", "IV"] as const;
export type RegionalMinimumWageZone =
	(typeof REGIONAL_MINIMUM_WAGE_ZONES)[number];

export const STATUTORY_PROFILE_STATUSES = ["active", "superseded"] as const;
export type StatutoryProfileStatus =
	(typeof STATUTORY_PROFILE_STATUSES)[number];

/** Closed, versionable relief-declaration vocabulary. */
export const STATUTORY_RELIEF_CODES = [
	"self",
	"spouse",
	"child",
	"parent",
	"disabled_self",
	"disabled_dependant",
	"life_insurance",
	"medical_insurance",
	"education",
	"approved_donation",
	"pension_contribution",
] as const;
export type StatutoryReliefCode = (typeof STATUTORY_RELIEF_CODES)[number];

/** Bump when the relief-declaration shape changes; pinned on every row. */
export const STATUTORY_RELIEF_DECLARATION_VERSION =
	"hr.statutory-relief.v1" as const;

export const statutoryJurisdictionCodeSchema = z.enum(
	STATUTORY_JURISDICTION_CODES,
);
export const taxResidencyStatusSchema = z.enum(TAX_RESIDENCY_STATUSES);
export const regionalMinimumWageZoneSchema = z.enum(
	REGIONAL_MINIMUM_WAGE_ZONES,
);
export const statutoryProfileStatusSchema = z.enum(STATUTORY_PROFILE_STATUSES);
export const statutoryReliefCodeSchema = z.enum(STATUTORY_RELIEF_CODES);

export function isStatutoryProfileOpen(input: {
	effectiveTo: string | null;
	status: StatutoryProfileStatus;
}): boolean {
	return input.status === "active" && input.effectiveTo === null;
}
