import { randomUUID } from "node:crypto";

import type {
	HumanResourcesDepartmentId,
	HumanResourcesJobId,
} from "../../src/brands";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createDepartment } from "../../src/organization/department";
import { createJob } from "../../src/organization/job";

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
