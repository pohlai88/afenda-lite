import type {
	CaCompanyStatus,
	CaCompanyStatusHistory,
	CaLegalCompanyDetail,
} from "../schemas";

import { filterEffectiveAsOf } from "./effective-range";

export function resolveStatusAsOf(
	history: CaCompanyStatusHistory[],
	asOf: string,
	fallback: CaCompanyStatus,
): CaCompanyStatus {
	const applicable = [...history]
		.filter((row) => row.effectiveDate <= asOf)
		.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
	if (applicable[0]) {
		return applicable[0].toStatus;
	}
	const future = [...history]
		.filter((row) => row.effectiveDate > asOf)
		.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
	if (future[0]?.fromStatus) {
		return future[0].fromStatus;
	}
	return fallback;
}

export function buildLegalCompanyAsOfView(
	detail: CaLegalCompanyDetail,
	asOf: string,
): CaLegalCompanyDetail {
	return {
		...detail,
		status: resolveStatusAsOf(detail.statusHistory, asOf, detail.status),
		names: filterEffectiveAsOf(detail.names, asOf),
		identifiers: filterEffectiveAsOf(detail.identifiers, asOf),
	};
}
