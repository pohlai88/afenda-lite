import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../../../kernel/identity/brands";
import type { EmploymentStatus } from "./employment-status";

export const EMPLOYMENT_STATUS_CHANGE_KINDS = [
	"create",
	"lifecycle",
	"correction",
] as const;

export type EmploymentStatusChangeKind =
	(typeof EMPLOYMENT_STATUS_CHANGE_KINDS)[number];

export interface EmploymentStatusHistory {
	actorUserId: string;
	changeKind: EmploymentStatusChangeKind;
	correlationId: string;
	createdAt: Date;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endsOnSnapshot: string | null;
	evidenceReference: string | null;
	fromStatus: EmploymentStatus | null;
	id: string;
	organizationId: string;
	reason: string | null;
	startsOnSnapshot: string;
	toStatus: EmploymentStatus;
}

export interface EmploymentStatusAsOf {
	effectiveOn: string;
	endsOn: string | null;
	startsOn: string;
	status: EmploymentStatus;
}

export function resolveEmploymentStatusAsOf(input: {
	history: readonly EmploymentStatusHistory[];
	asOf: string;
}): EmploymentStatusAsOf | null {
	const eligible = [...input.history]
		.filter((row) => row.effectiveOn <= input.asOf)
		.sort((left, right) => {
			const byEffective = right.effectiveOn.localeCompare(left.effectiveOn);
			if (byEffective !== 0) {
				return byEffective;
			}
			return right.createdAt.getTime() - left.createdAt.getTime();
		});
	return eligible[0]
		? {
				status: eligible[0].toStatus,
				startsOn: eligible[0].startsOnSnapshot,
				endsOn: eligible[0].endsOnSnapshot,
				effectiveOn: eligible[0].effectiveOn,
			}
		: null;
}

export function resolveLifecycleEffectiveOn(input: {
	status: EmploymentStatus;
	startsOn: string;
	endsOn: string | null;
	requestedEffectiveOn?: string | undefined;
}): string {
	if (input.requestedEffectiveOn !== undefined) {
		return input.requestedEffectiveOn;
	}
	if (input.status === "terminated") {
		return input.endsOn ?? input.startsOn;
	}
	return input.startsOn;
}
