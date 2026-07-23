import { createDrizzleAssignmentContextQuery } from "./adapters/drizzle/assignment-context-query";
import type { AssignmentContextQueryPort } from "./time/handoff/ports";

export function createProductionAssignmentContextQuery(deps?: {
	query?: AssignmentContextQueryPort;
}): AssignmentContextQueryPort {
	return deps?.query ?? createDrizzleAssignmentContextQuery();
}
