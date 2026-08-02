import { randomUUID } from "node:crypto";
import { createDepartment } from "../../src/features/organization/department";
import { createJob } from "../../src/features/organization/job";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import type {
	HumanResourcesDepartmentId,
	HumanResourcesJobId,
} from "../../src/kernel/identity/brands";

/** Seed active department + job for position create (HR-03 required FKs). */
export async function seedDepartmentAndJob(
	options: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId?: string;
	},
): Promise<{
	departmentId: HumanResourcesDepartmentId;
	jobId: HumanResourcesJobId;
} | null> {
	const suffix = randomUUID().slice(0, 8);
	const department = await createDepartment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId ?? `corr-dept-${suffix}`,
			code: `D-${suffix}`,
			name: `Department ${suffix}`,
			status: "active",
		},
		options,
	);
	if (!department.ok) {
		return null;
	}
	const job = await createJob(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId ?? `corr-job-${suffix}`,
			code: `J-${suffix}`,
			title: `Job ${suffix}`,
			status: "active",
		},
		options,
	);
	if (!job.ok) {
		return null;
	}
	return { departmentId: department.data.id, jobId: job.data.id };
}
