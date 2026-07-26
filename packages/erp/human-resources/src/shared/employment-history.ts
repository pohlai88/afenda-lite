import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../brands";
import type { EmploymentStatus } from "./employment-status";

export const EMPLOYMENT_STATUS_CHANGE_KINDS = [
	"create",
	"lifecycle",
	"correction",
] as const;

export type EmploymentStatusChangeKind =
	(typeof EMPLOYMENT_STATUS_CHANGE_KINDS)[number];

export type EmploymentStatusHistory = {
	id: string;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	fromStatus: EmploymentStatus | null;
	toStatus: EmploymentStatus;
	startsOnSnapshot: string;
	endsOnSnapshot: string | null;
	effectiveOn: string;
	changeKind: EmploymentStatusChangeKind;
	reason: string | null;
	evidenceReference: string | null;
	correlationId: string;
	actorUserId: string;
	createdAt: Date;
};

export type EmploymentStatusAsOf = {
	status: EmploymentStatus;
	startsOn: string;
	endsOn: string | null;
	effectiveOn: string;
};

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
	requestedEffectiveOn?: string;
}): string {
	if (input.requestedEffectiveOn !== undefined) {
		return input.requestedEffectiveOn;
	}
	if (input.status === "terminated") {
		return input.endsOn ?? input.startsOn;
	}
	return input.startsOn;
}
