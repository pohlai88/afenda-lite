import { fail, ok, type Result } from "@afenda/errors/result";

export type AccountingPermission =
	| "accounting.journal.read"
	| "accounting.journal.create"
	| "accounting.journal.update"
	| "accounting.journal.post"
	| "accounting.journal.reverse"
	| "accounting.trial_balance.read"
	| "accounting.ledger.read"
	| "accounting.period.read"
	| "accounting.period.open"
	| "accounting.period.soft_close"
	| "accounting.period.close"
	| "accounting.period.reopen"
	| "accounting.account.read"
	| "accounting.account.manage"
	| "accounting.posting_rule.manage"
	| "accounting.exception.read"
	| "accounting.exception.manage";

export type AccountingAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: AccountingPermission;
	}): Promise<boolean>;
};

export async function requireAccountingPermission(
	authorization: AccountingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: AccountingPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Accounting authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required accounting permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
