import { authServer } from "@afenda/auth";
import { listPaymentAccounts, listPayments } from "@afenda/payments";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	WorkspacePage,
	WorkspacePageContent,
	WorkspacePageHeader,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import { PaymentAccountsTable } from "@/features/payments/payment-accounts-table";
import {
	AddPaymentApplicationInstructionForm,
	CreateAndPostPaymentTransferForm,
	CreateDraftPaymentForm,
	CreatePaymentAccountForm,
	GetPaymentApplicationAvailabilityForm,
	PostPaymentForm,
	PostRefundForm,
	ReversePaymentForm,
} from "@/features/payments/payments-forms";
import { PaymentsTable } from "@/features/payments/payments-table";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

interface PaymentsShellProps {
	surface: "admin" | "client";
}

const formSections = [
	["Create draft payment", CreateDraftPaymentForm, "payments.payment.create"],
	[
		"Create payment account",
		CreatePaymentAccountForm,
		"payments.account.manage",
	],
	[
		"Add application instruction",
		AddPaymentApplicationInstructionForm,
		"payments.application_instruction.manage",
	],
	[
		"Create and post transfer",
		CreateAndPostPaymentTransferForm,
		"payments.transfer.create",
	],
	["Post payment", PostPaymentForm, "payments.payment.post"],
	["Reverse payment", ReversePaymentForm, "payments.payment.reverse"],
	["Post refund", PostRefundForm, "payments.refund.create"],
	[
		"Application availability",
		GetPaymentApplicationAvailabilityForm,
		"payments.availability.read",
	],
] as const;

/** Payments console — RSC reads via `@afenda/payments`; mutations via Actions. */
export async function PaymentsShell({ surface }: PaymentsShellProps) {
	const session =
		surface === "admin"
			? await authServer.session.requireRole("operator")
			: await authServer.session.get();
	await requirePermission(session, "payments.payment.read");
	const formPermissions = await Promise.all(
		formSections.map(([, , permission]) =>
			sessionHasPermission(session, permission),
		),
	);
	const canReadAccounts = await sessionHasPermission(
		session,
		"payments.account.read",
	);
	const options = createPaymentsCommandOptions();
	const [paymentsResult, accountsResult] = await Promise.all([
		listPayments(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			options,
		),
		canReadAccounts
			? listPaymentAccounts(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					options,
				)
			: Promise.resolve(null),
	]);
	const payments = paymentsResult.ok ? paymentsResult.data : [];
	const paymentRows = payments.map((payment) => ({
		id: payment.id,
		code: payment.code,
		direction: payment.direction,
		status: payment.status,
		version: payment.version,
		currencyCode: payment.currencyCode,
		amount: payment.amount,
		purpose: payment.purpose,
		instructionCount: payment.applicationInstructions.length,
	}));
	const accounts = accountsResult?.ok ? accountsResult.data : [];
	const accountRows = accounts.map((account) => ({
		id: account.id,
		code: account.code,
		name: account.name,
		kind: account.kind,
		currencyCode: account.currencyCode,
		active: account.active,
	}));

	return (
		<WorkspacePage>
			<WorkspacePageHeader
				description="Create and allocate payments, post completed transactions, reverse posted payments, and issue refunds."
				scope={`${surface === "admin" ? "Operator" : "Client"} · Payments`}
				title="Payments"
			/>
			<WorkspacePageContent>
				{canReadAccounts && accountsResult !== null && !accountsResult.ok ? (
					<Alert>
						<AlertTitle>Could not load payment accounts</AlertTitle>
						<AlertDescription>{accountsResult.message}</AlertDescription>
					</Alert>
				) : null}

				<Card>
					<CardHeader>
						<CardTitle>Payment register</CardTitle>
						<CardDescription>
							{payments.length} payment(s) · pageSize ≤ 50
						</CardDescription>
					</CardHeader>
					<CardContent>
						<PaymentsTable
							error={paymentsResult.ok ? undefined : paymentsResult.message}
							rows={paymentRows}
						/>
					</CardContent>
				</Card>

				{canReadAccounts ? (
					<Card>
						<CardHeader>
							<CardTitle>Payment accounts</CardTitle>
							<CardDescription>{accounts.length} account(s)</CardDescription>
						</CardHeader>
						<CardContent>
							<PaymentAccountsTable rows={accountRows} />
						</CardContent>
					</Card>
				) : null}

				{formSections.map(([title, Form], index) => (
					<Card key={title}>
						<CardHeader>
							<CardTitle>{title}</CardTitle>
						</CardHeader>
						<CardContent>
							<Form canManage={formPermissions[index] ?? false} />
						</CardContent>
					</Card>
				))}
			</WorkspacePageContent>
		</WorkspacePage>
	);
}
