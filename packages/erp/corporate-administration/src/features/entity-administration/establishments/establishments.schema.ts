import { z } from "zod";

import {
	ESTABLISHMENT_STATUSES,
	ESTABLISHMENT_TYPES,
} from "../../../kernel/contracts/domain";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

/** `^[A-Z]{2}$` matches `ca_legal_establishment_jurisdiction_check` in @afenda/db. */
const jurisdictionCode = z
	.string()
	.regex(/^[A-Z]{2}$/, "must be a two-letter uppercase jurisdiction code");

export const RegisterEstablishmentInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	idempotencyKey: z.string().min(1),
	legalCompanyId: z.string().uuid(),
	establishmentType: z.enum(ESTABLISHMENT_TYPES),
	jurisdictionCode,
	registrationIdentifier: z.string().min(1).max(100),
	displayName: z.string().min(1).max(200),
	registeredFrom: isoDate,
	sourceDocumentId: z.string().min(1),
});

export const UpdateEstablishmentInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	idempotencyKey: z.string().min(1),
	id: z.string().uuid(),
	displayName: z.string().min(1).max(200),
	expectedVersion: z.number().int().positive(),
});

const TransitionEstablishmentInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	idempotencyKey: z.string().min(1),
	id: z.string().uuid(),
	effectiveFrom: isoDate,
	reason: z.string().min(1).max(500).optional(),
	expectedVersion: z.number().int().positive(),
	sourceDocumentId: z.string().min(1),
});

export const ActivateEstablishmentInput = TransitionEstablishmentInput;
export const SuspendEstablishmentInput = TransitionEstablishmentInput;
export const CloseEstablishmentInput = TransitionEstablishmentInput;

export const GetEstablishmentInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	id: z.string().uuid(),
});

export const ListEstablishmentInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	legalCompanyId: z.string().uuid().optional(),
	status: z.enum(ESTABLISHMENT_STATUSES).optional(),
	cursor: z.string().optional(),
	limit: z.number().int().positive().max(200).default(50),
});
