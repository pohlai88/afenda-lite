import { errorResult, type Result } from "@afenda/errors";
import type {
	PayrollPrivacyPort,
	PayrollPrivacyRequestContext,
	PayrollRetentionEvidence,
	PayrollSubjectAccessExport,
} from "../../src/features/privacy/contract";

export function createMemoryPayrollPrivacyPort(): PayrollPrivacyPort {
	const restrictions = new Map<
		string,
		{ restrictionId: string; restrictionReference: string }
	>();
	const evidence = new Map<string, PayrollRetentionEvidence>();
	let restrictionSequence = 0;
	let evidenceSequence = 0;
	let exportSequence = 0;

	function subjectKey(input: {
		organizationId: string;
		subjectEmployeeId: string;
	}): string {
		return `${input.organizationId}:${input.subjectEmployeeId}`;
	}

	return {
		evaluateRestriction(input) {
			const active = restrictions.get(subjectKey(input));
			return Promise.resolve(
				errorResult.ok(
					active === undefined
						? { restricted: false }
						: {
								restricted: true,
								reasonCode: active.restrictionReference,
							},
				),
			);
		},
		restrictSubject(input) {
			restrictionSequence += 1;
			const restrictionId = `payroll-restriction-${restrictionSequence}`;
			restrictions.set(subjectKey(input), {
				restrictionId,
				restrictionReference: input.restrictionReference,
			});
			return Promise.resolve(errorResult.ok({ restrictionId }));
		},
		liftRestriction(input) {
			for (const [key, value] of restrictions) {
				if (
					value.restrictionId === input.restrictionId &&
					key.startsWith(`${input.organizationId}:`)
				) {
					restrictions.delete(key);
					return Promise.resolve(errorResult.ok(undefined));
				}
			}
			return Promise.resolve(
				errorResult.fail("NOT_FOUND", {
					publicMessage: "Restriction was not found for this organization.",
				}),
			);
		},
		recordRetentionEvidence(input) {
			evidenceSequence += 1;
			const recorded: PayrollRetentionEvidence = {
				evidenceId: `payroll-retention-${evidenceSequence}`,
				organizationId: input.organizationId,
				subjectEmployeeId: input.subjectEmployeeId,
				classifications: input.classifications,
				clockStartedAt: input.clockStartedAt,
				minimumRetentionMonths: input.minimumRetentionMonths,
				legalBasis: input.legalBasis,
				eligibleForErasure: false,
			};
			evidence.set(recorded.evidenceId, recorded);
			return Promise.resolve(errorResult.ok(recorded));
		},
		expireRetention(input) {
			const existing = evidence.get(input.evidenceId);
			if (
				existing === undefined ||
				existing.organizationId !== input.organizationId
			) {
				return Promise.resolve(
					errorResult.fail("NOT_FOUND", {
						publicMessage:
							"Retention evidence was not found for this organization.",
					}),
				);
			}
			const started = new Date(existing.clockStartedAt);
			const eligibleAt = new Date(
				Date.UTC(
					started.getUTCFullYear(),
					started.getUTCMonth() + existing.minimumRetentionMonths,
					started.getUTCDate(),
					started.getUTCHours(),
					started.getUTCMinutes(),
					started.getUTCSeconds(),
					started.getUTCMilliseconds(),
				),
			);
			if (new Date(input.expiredAt).getTime() < eligibleAt.getTime()) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage:
							"Retention clock has not expired; payroll evidence stays restricted.",
					}),
				);
			}
			const expired: PayrollRetentionEvidence = {
				...existing,
				eligibleForErasure: true,
			};
			evidence.set(input.evidenceId, expired);
			return Promise.resolve(errorResult.ok(expired));
		},
		exportSubjectAccess(
			input: PayrollPrivacyRequestContext & {
				projectionScope: "read-own" | "read-all";
				records: PayrollSubjectAccessExport["records"];
			},
		): Promise<Result<PayrollSubjectAccessExport>> {
			const active = restrictions.get(subjectKey(input));
			if (active !== undefined) {
				return Promise.resolve(
					errorResult.fail("CONFLICT", {
						publicMessage:
							"Subject data is restricted and excluded from export.",
					}),
				);
			}
			exportSequence += 1;
			return Promise.resolve(
				errorResult.ok({
					exportReference: `payroll://exports/${exportSequence}`,
					recordCount: input.records.length,
					projectionScope: input.projectionScope,
					records: input.records,
				}),
			);
		},
	};
}
