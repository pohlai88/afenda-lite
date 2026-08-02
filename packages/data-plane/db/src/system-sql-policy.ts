import { normalizeSqlForPolicy } from "./tenant-sql-policy";

/**
 * Closed registry for the exceptional cross-organization SQL operations that
 * infrastructure workers must perform. The owner path is consumed by the
 * repository source gate; runtime validation remains fail-closed here.
 */
export const SYSTEM_SQL_OPERATION_POLICIES = {
	"human-resources.reliability.claim-due": {
		ownerSource:
			"packages/erp/human-resources/src/kernel/reliability/adapters/drizzle.ts",
		hardTenantTables: ["hr_reliability_work_item"],
	},
} as const;

const RELIABILITY_CLAIM_OPERATION = "human-resources.reliability.claim-due";

export type SystemSqlOperation = keyof typeof SYSTEM_SQL_OPERATION_POLICIES;

function assertReliabilityClaimDue(statement: string): void {
	const requiredPatterns = [
		/\bpartition\s+by\s+organization_id\b/,
		/\bfor\s+update\s+of\s+work\s+skip\s+locked\b/,
		/\bupdate\s+hr_reliability_work_item\s+(?:as\s+)?work\b/,
		/\branked\.organization_id\s*=\s*work\.organization_id\b/,
		/\bwork\.organization_id\s*=\s*eligible\.organization_id\b/,
		/\breturning\b[\s\S]*\bwork\.organization_id\b/,
	];
	if (requiredPatterns.some((pattern) => !pattern.test(statement))) {
		throw new Error(
			`System SQL policy rejected operation: ${RELIABILITY_CLAIM_OPERATION}`,
		);
	}
}

/** Validate an explicitly registered cross-organization statement. */
export function assertSystemSqlSafety(
	operation: SystemSqlOperation,
	rawStatement: string,
): void {
	const policy = SYSTEM_SQL_OPERATION_POLICIES[operation];
	if (policy === undefined) {
		throw new Error(`Unknown system SQL operation: ${String(operation)}`);
	}
	const statement = normalizeSqlForPolicy(rawStatement);
	if (statement.split(";").filter((part) => part.trim() !== "").length > 1) {
		throw new Error(`System SQL policy rejected operation: ${operation}`);
	}

	const hardTenantMentions = [
		...statement.matchAll(/\b(?:[a-z_][a-z0-9_$]*\.)?(hr_[a-z0-9_]+|platform_[a-z0-9_]+|erp_[a-z0-9_]+)\b/g),
	]
		.map((match) => match[1])
		.filter((table): table is string => table !== undefined);
	const allowedTables = new Set<string>(policy.hardTenantTables);
	if (
		hardTenantMentions.length === 0 ||
		hardTenantMentions.some((table) => !allowedTables.has(table)) ||
		policy.hardTenantTables.some((table) => !hardTenantMentions.includes(table))
	) {
		throw new Error(`System SQL policy rejected operation: ${operation}`);
	}

	if (operation === RELIABILITY_CLAIM_OPERATION) {
		assertReliabilityClaimDue(statement);
	}
}
