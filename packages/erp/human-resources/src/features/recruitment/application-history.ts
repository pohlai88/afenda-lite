import type {
	HumanResourcesApplicationId,
	HumanResourcesCandidateId,
	HumanResourcesRequisitionId,
} from "../../kernel/identity/brands";
import type { ApplicationStatus } from "./status";

export const APPLICATION_STATUS_CHANGE_KINDS = ["create", "lifecycle"] as const;

export type ApplicationStatusChangeKind =
	(typeof APPLICATION_STATUS_CHANGE_KINDS)[number];

export interface ApplicationStatusHistory {
	actorUserId: string;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	changeKind: ApplicationStatusChangeKind;
	correlationId: string;
	createdAt: Date;
	fromStatus: ApplicationStatus | null;
	id: string;
	organizationId: string;
	reason: string | null;
	reasonCode: string | null;
	requisitionId: HumanResourcesRequisitionId;
	toStatus: ApplicationStatus;
}
