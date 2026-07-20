"use server";

import { listPaymentAccounts, type PaymentAccount } from "@afenda/payments";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

export async function listPaymentAccountsAction(): Promise<ActionResult<{ accounts: PaymentAccount[] }>> {
	return runOperatorPermissionAction({
		path: "listPaymentAccountsAction",
		permission: "payments.account.read",
		safeMessage: "Could not list payment accounts. Try again or contact an admin.",
		execute: async (session) => {
			const mapped = mapPackageResult(await listPaymentAccounts(
				{ organizationId: session.orgId, actorUserId: session.userId },
				createPaymentsCommandOptions(),
			));
			return mapped.ok ? { ok: true, data: { accounts: mapped.data } } : mapped;
		},
	});
}
