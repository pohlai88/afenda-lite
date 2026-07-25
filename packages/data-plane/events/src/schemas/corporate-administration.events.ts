import { z } from "zod";

const companyPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("legal_company"),
	entityId: z.string().uuid(),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	status: z.string().trim().min(1),
});

export const caCompanyPayloadSchema = companyPayloadBase;

export type CaCompanyPayload = z.infer<typeof caCompanyPayloadSchema>;

export const CorporateAdministrationEventSchemas = {
	"corporate-administration.company.created.v1": caCompanyPayloadSchema,
	"corporate-administration.company.updated.v1": caCompanyPayloadSchema,
	"corporate-administration.company.activated.v1": caCompanyPayloadSchema,
	"corporate-administration.company.status-changed.v1": caCompanyPayloadSchema,
	"corporate-administration.company.suspended.v1": caCompanyPayloadSchema,
	"corporate-administration.company.dissolved.v1": caCompanyPayloadSchema,
	"corporate-administration.company.archived.v1": caCompanyPayloadSchema,
} as const;

export type CorporateAdministrationEventType =
	keyof typeof CorporateAdministrationEventSchemas;

export const CA_COMPANY_CREATED_EVENT =
	"corporate-administration.company.created.v1" as const;
export const CA_COMPANY_UPDATED_EVENT =
	"corporate-administration.company.updated.v1" as const;
export const CA_COMPANY_ACTIVATED_EVENT =
	"corporate-administration.company.activated.v1" as const;
export const CA_COMPANY_STATUS_CHANGED_EVENT =
	"corporate-administration.company.status-changed.v1" as const;
export const CA_COMPANY_SUSPENDED_EVENT =
	"corporate-administration.company.suspended.v1" as const;
export const CA_COMPANY_DISSOLVED_EVENT =
	"corporate-administration.company.dissolved.v1" as const;
export const CA_COMPANY_ARCHIVED_EVENT =
	"corporate-administration.company.archived.v1" as const;

export const CA_EVENT_IDS = [
	CA_COMPANY_CREATED_EVENT,
	CA_COMPANY_UPDATED_EVENT,
	CA_COMPANY_ACTIVATED_EVENT,
	CA_COMPANY_STATUS_CHANGED_EVENT,
	CA_COMPANY_SUSPENDED_EVENT,
	CA_COMPANY_DISSOLVED_EVENT,
	CA_COMPANY_ARCHIVED_EVENT,
] as const satisfies readonly CorporateAdministrationEventType[];
