import type { Result } from "@afenda/errors";
import type {
	PayrollJob,
	PayrollJobDeadLetter,
	PayrollJobWorkItem,
} from "./contract";

export interface PayrollJobStore {
	claimDueWork: (input: {
		leaseExpiresAt: Date;
		limit: number;
		now: Date;
		workerId: string;
	}) => Promise<Result<readonly PayrollJobWorkItem[]>>;
	createJob: (input: {
		job: PayrollJob;
		workItem: PayrollJobWorkItem;
	}) => Promise<Result<PayrollJob>>;
	findJobByIdempotencyKey: (input: {
		idempotencyKey: string;
		organizationId: string;
	}) => Promise<Result<PayrollJob | null>>;
	getDeadLetter: (input: {
		deadLetterId: string;
		organizationId: string;
	}) => Promise<Result<PayrollJobDeadLetter | null>>;
	getJob: (input: {
		jobId: string;
		organizationId: string;
	}) => Promise<Result<PayrollJob | null>>;
	getWorkItem: (input: {
		organizationId: string;
		workItemId: string;
	}) => Promise<Result<PayrollJobWorkItem | null>>;
	listDeadLetters: (input: {
		jobId?: string;
		organizationId: string;
	}) => Promise<Result<readonly PayrollJobDeadLetter[]>>;
	saveJobProgress: (input: {
		deadLetter: PayrollJobDeadLetter | null;
		expectedJobVersion: number;
		expectedWorkVersion: number;
		job: PayrollJob;
		successorWorkItem: PayrollJobWorkItem | null;
		workItem: PayrollJobWorkItem;
	}) => Promise<Result<PayrollJob>>;
}
