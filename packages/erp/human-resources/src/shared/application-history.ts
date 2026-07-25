import type {
	HumanResourcesApplicationId,
	HumanResourcesCandidateId,
	HumanResourcesRequisitionId,
} from "../brands";
import type { ApplicationStatus } from "./recruitment-status";

export const APPLICATION_STATUS_CHANGE_KINDS = ["create", "lifecycle"] as const;

export type ApplicationStatusChangeKind =
	(typeof APPLICATION_STATUS_CHANGE_KINDS)[number];

export type ApplicationStatusHistory = {
	id: string;
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	fromStatus: ApplicationStatus | null;
	toStatus: ApplicationStatus;
	changeKind: ApplicationStatusChangeKind;
	reason: string | null;
	reasonCode: string | null;
	correlationId: string;
	actorUserId: string;
	createdAt: Date;
};
