import { z } from "zod";

export const HEADCOUNT_PLAN_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"rejected",
	"superseded",
	"closed",
] as const;
export type HeadcountPlanStatus = (typeof HEADCOUNT_PLAN_STATUSES)[number];

export const HEADCOUNT_RESERVATION_STATUSES = [
	"active",
	"released",
	"consumed",
] as const;
export type HeadcountReservationStatus =
	(typeof HEADCOUNT_RESERVATION_STATUSES)[number];

export const HEADCOUNT_EMPLOYMENT_TYPES = [
	"full_time",
	"part_time",
	"contract",
	"temporary",
	"intern",
] as const;
export type HeadcountEmploymentType =
	(typeof HEADCOUNT_EMPLOYMENT_TYPES)[number];

export const headcountPlanStatusSchema = z.enum(HEADCOUNT_PLAN_STATUSES);
export const headcountReservationStatusSchema = z.enum(
	HEADCOUNT_RESERVATION_STATUSES,
);
export const headcountEmploymentTypeSchema = z.enum(HEADCOUNT_EMPLOYMENT_TYPES);

export function isHeadcountPlanEditable(status: HeadcountPlanStatus): boolean {
	return status === "draft" || status === "submitted";
}

export function isHeadcountPlanApproved(status: HeadcountPlanStatus): boolean {
	return status === "approved";
}
