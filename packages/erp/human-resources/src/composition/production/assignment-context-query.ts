import type { AssignmentContextQueryPort } from "../../features/time/handoff/ports";
import { createDrizzleAssignmentContextQuery } from "../../features/workforce-records/employment/adapters/assignment-context-query.drizzle";

export function createProductionAssignmentContextQuery(deps?: {
	query?: AssignmentContextQueryPort;
}): AssignmentContextQueryPort {
	return deps?.query ?? createDrizzleAssignmentContextQuery();
}
