import type {
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompanyAsOf,
	CaLegalCompanyDetail,
	CaLegalCompanyStatus,
} from "../types";

import { filterEffectiveAsOf } from "./effective-range";

function statusHistoryAsOfDate(row: CaCompanyStatusHistory): string {
	return row.effectiveAt.toISOString().slice(0, 10);
}

export function resolveStatusAsOf(
	history: readonly CaCompanyStatusHistory[],
	asOf: string,
	fallback: CaLegalCompanyStatus,
): CaLegalCompanyStatus {
	const applicable = [...history]
		.filter((row) => statusHistoryAsOfDate(row) <= asOf)
		.sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());
	if (applicable[0]) {
		return applicable[0].toStatus;
	}
	const future = [...history]
		.filter((row) => statusHistoryAsOfDate(row) > asOf)
		.sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime());
	if (future[0]?.fromStatus) {
		return future[0].fromStatus;
	}
	return fallback;
}

function selectEffectiveLegalName(
	names: readonly CaCompanyName[],
	asOf: string,
): CaCompanyName | null {
	const effective = filterEffectiveAsOf([...names], asOf);
	return (
		effective.find((name) => name.nameType === "legal" && name.isPrimary) ??
		effective.find((name) => name.nameType === "legal") ??
		null
	);
}

export function buildLegalCompanyAsOfView(
	detail: CaLegalCompanyDetail,
	asOf: string,
): CaLegalCompanyAsOf {
	const status = resolveStatusAsOf(detail.statusHistory, asOf, detail.status);
	const effectiveIdentifiers = filterEffectiveAsOf(
		[...detail.identifiers],
		asOf,
	).filter((identifier) => identifier.status === "active");

	return {
		company: {
			...detail,
			status,
		},
		status,
		effectiveName: selectEffectiveLegalName(detail.names, asOf),
		effectiveIdentifiers,
		asOf,
	};
}
