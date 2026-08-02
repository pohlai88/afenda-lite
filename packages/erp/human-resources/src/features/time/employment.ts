import { errorResult, type Result } from "@afenda/errors";
import type { Employment } from "../../kernel/contracts";
import { invalidInput, notFound } from "../../kernel/execution/domain-guards";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../../kernel/identity/brands";
import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";

type TimeEmploymentStore = Pick<
	HumanResourcesCoreStore,
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
	if (!loaded.ok) {
		return loaded;
	}
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
	return errorResult.ok(loaded.data);
}
