import { ok, type Result } from "@afenda/errors/result";

import type { CaLegalCompanyDetail } from "../company/types";
import type { CorporateAdministrationCompanyStore } from "../store/company-store";

export async function loadLegalCompanyDetail(
	store: CorporateAdministrationCompanyStore,
	organizationId: string,
	legalCompanyId: string,
): Promise<Result<CaLegalCompanyDetail | null>> {
	const company = await store.getLegalCompany(organizationId, legalCompanyId);
	if (!company.ok) return company;
	if (!company.data) {
		return ok(null);
	}
	const names = await store.listCompanyNames({
		organizationId,
		legalCompanyId: company.data.id,
	});
	if (!names.ok) return names;
	const identifiers = await store.listCompanyIdentifiers({
		organizationId,
		legalCompanyId: company.data.id,
	});
	if (!identifiers.ok) return identifiers;
	const history = await store.listCompanyStatusHistory({
		organizationId,
		legalCompanyId: company.data.id,
	});
	if (!history.ok) return history;
	return ok({
		...company.data,
		names: names.data,
		identifiers: identifiers.data,
		statusHistory: history.data,
	});
}

export function buildMutationMeta(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	causationId?: string | null;
	idempotencyKey: string;
	requestFingerprint: string;
	eventType: import("@afenda/events/schemas").CorporateAdministrationEventType;
	legalCompanyCode?: string;
	occurredAt?: string;
}): import("../store/company-store").CorporateAdministrationMutationMeta {
	return {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		causationId: input.causationId ?? null,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint: input.requestFingerprint,
		occurredAt: input.occurredAt ?? new Date().toISOString(),
		eventType: input.eventType,
		legalCompanyCode: input.legalCompanyCode,
	};
}
