import { orgWhere, tenantEntityPredicate, withOrg } from "../src/client";
import {
	type NeonHttpSql,
	runNeonHttpTransaction,
} from "../src/http-transaction";
import { mdParty } from "../src/schema/master-data";
import {
	platformDomainEvent,
	platformRole,
	platformRoleAssignment,
} from "../src/schema/platform";

const consumeTypecheckValue = (_value: unknown): undefined => undefined;

/** Compile-time contracts for tenant predicate column and row inference. */
export async function typecheckTenantPredicateContracts(): Promise<
	typeof mdParty.$inferSelect | undefined
> {
	orgWhere(mdParty.organizationId, "org-a");
	tenantEntityPredicate(
		{
			id: platformRoleAssignment.id,
			organizationId: platformRoleAssignment.organizationId,
		},
		{ id: "assignment-a", organizationId: "org-a" },
	);

	const rows = await withOrg(mdParty, "org-a");
	const row: typeof mdParty.$inferSelect | undefined = rows[0];

	// @ts-expect-error -- numeric columns cannot establish organization ownership.
	orgWhere(platformDomainEvent.attempts, "org-a");

	// @ts-expect-error -- nullable columns cannot establish required organization ownership.
	orgWhere(platformRole.organizationId, "org-a");

	tenantEntityPredicate(
		{
			id: platformRoleAssignment.id,
			organizationId: platformRoleAssignment.organizationId,
		},
		{
			id: "assignment-a",
			// @ts-expect-error -- organization identity input is always a string.
			organizationId: 42,
		},
	);

	return row;
}

export async function typecheckTransactionResultInference(
	sql: NeonHttpSql,
): Promise<void> {
	const results = await runNeonHttpTransaction(
		(governedSql) => [governedSql`select 1`] as const,
	);
	consumeTypecheckValue(results[0]);

	// @ts-expect-error -- a one-query transaction has no second result.
	consumeTypecheckValue(results[1]);

	// @ts-expect-error -- prebuilt query arrays bypass tenant governance.
	await runNeonHttpTransaction([sql`select 1`]);

	// @ts-expect-error -- unrestricted SQL is absent from the governed client.
	sql.unsafe("select 1");
}
