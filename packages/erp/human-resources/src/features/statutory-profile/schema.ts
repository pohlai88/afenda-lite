import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesStatutoryProfileIdSchema,
} from "../../kernel/identity/brands";
import {
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../../kernel/validation/common";
import {
	regionalMinimumWageZoneSchema,
	statutoryJurisdictionCodeSchema,
	statutoryReliefCodeSchema,
	taxResidencyStatusSchema,
} from "./status";

/** Money-as-string, matching every other HR money field. */
const statutoryMoneyAmountSchema = z
	.string()
	.trim()
	.regex(/^-?\d+(\.\d{1,6})?$/);

const currencyCodeSchema = z.string().trim().length(3).toUpperCase();

const isoCountryCodeSchema = z
	.string()
	.trim()
	.length(2)
	.regex(/^[A-Z]{2}$/);

const statutoryIdentifierSchema = z.string().trim().min(1).max(64);

export const statutoryReliefDeclarationSchema = z
	.object({
		reliefCode: statutoryReliefCodeSchema,
		amount: statutoryMoneyAmountSchema.nullable().optional(),
		currencyCode: currencyCodeSchema.nullable().optional(),
		dependantReference: z.string().trim().min(1).max(128).nullable().optional(),
		evidenceRef: z.string().trim().min(1).max(256).nullable().optional(),
	})
	.strict();

export const upsertStatutoryProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			jurisdictionCode: statutoryJurisdictionCodeSchema,
			taxResidencyStatus: taxResidencyStatusSchema,
			nationalityCountryCode: isoCountryCodeSchema,
			expatriate: z.boolean(),
			minimumWageZone: regionalMinimumWageZoneSchema.nullable().optional(),
			taxFileNumber: statutoryIdentifierSchema.nullable().optional(),
			employeeProvidentFundNumber: statutoryIdentifierSchema
				.nullable()
				.optional(),
			socialSecurityNumber: statutoryIdentifierSchema.nullable().optional(),
			socialInsuranceBookNumber: statutoryIdentifierSchema
				.nullable()
				.optional(),
			dependantCount: z.number().int().nonnegative().max(99),
			reliefDeclarations: z.array(statutoryReliefDeclarationSchema).max(50),
			effectiveFrom: isoDateSchema,
		})
		.strict();

export const getStatutoryProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			asOf: isoDateSchema.optional(),
		})
		.strict();

export const listStatutoryProfilesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			jurisdictionCode: statutoryJurisdictionCodeSchema.optional(),
			statutoryProfileId: humanResourcesStatutoryProfileIdSchema.optional(),
		})
		.strict();

export const recordPriorEmployerYtdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			jurisdictionCode: statutoryJurisdictionCodeSchema,
			taxYear: z.number().int().min(1900).max(9999),
			priorEmployerName: z
				.string()
				.trim()
				.min(1)
				.max(200)
				.nullable()
				.optional(),
			grossAmount: statutoryMoneyAmountSchema,
			taxWithheldAmount: statutoryMoneyAmountSchema,
			statutoryContributionAmount: statutoryMoneyAmountSchema,
			currencyCode: currencyCodeSchema,
			recordedOn: isoDateSchema,
		})
		.strict();

export const listPriorEmployerYtdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			taxYear: z.number().int().min(1900).max(9999).optional(),
		})
		.strict();
