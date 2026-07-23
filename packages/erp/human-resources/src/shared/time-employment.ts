import { ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../brands";
import type { HumanResourcesStore } from "../store";
import type { Employment } from "../types";
import { invalidInput, notFound } from "./domain-guards";

type TimeEmploymentStore = Pick<
	HumanResourcesStore,
	"findEmploymentByEmployeeAsOf" | "getEmploymentById"
>;

export async function resolveActiveTimeEmployment(
	store: TimeEmploymentStore,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId | null;
		workDate: string;
	},
): Promise<Result<Employment>> {
	const loaded =
		input.employmentId === null
			? await store.findEmploymentByEmployeeAsOf({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					asOf: input.workDate,
				})
			: await store.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: input.employmentId,
				});
	if (!loaded.ok) return loaded;
	if (loaded.data === null) {
		return notFound("Active employment not found for Time fact");
	}
	if (loaded.data.employeeId !== input.employeeId) {
		return invalidInput("Employment does not belong to the employee");
	}
	if (
		loaded.data.status !== "active" &&
		loaded.data.status !== "notice" &&
		!(
			loaded.data.status === "terminated" &&
			loaded.data.endsOn !== null &&
			input.workDate <= loaded.data.endsOn
		)
	) {
		return invalidInput("Employment is not active for Time recording");
	}
	if (input.workDate < loaded.data.startsOn) {
		return invalidInput("Time fact precedes employment start");
	}
	if (loaded.data.endsOn !== null && input.workDate > loaded.data.endsOn) {
		return invalidInput("Time fact follows employment end");
	}
	return ok(loaded.data);
}
