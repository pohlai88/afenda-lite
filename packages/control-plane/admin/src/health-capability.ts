import {
	getHealthAggregate,
	getLivenessSnapshot,
	getReadinessSnapshot,
	inspectDatabaseConnection,
} from "./health";

/** Isolated operational-health capability; never loads the Neon Auth client. */
export const adminHealth = Object.freeze({
	aggregate: getHealthAggregate,
	database: Object.freeze({ inspect: inspectDatabaseConnection }),
	liveness: getLivenessSnapshot,
	readiness: getReadinessSnapshot,
});

export type AdminHealthCapability = typeof adminHealth;
