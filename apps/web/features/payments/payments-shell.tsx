import { getSession, requireRole } from "@afenda/auth";
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

type PaymentsShellProps = { surface: "admin" | "client" };

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
		surface === "admin" ? await requireRole("operator") : await getSession();
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
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Payments
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Create and allocate payments, post completed transactions, reverse
					posted payments, and issue refunds.
				</p>
			</div>

			{!paymentsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load payments</AlertTitle>
					<AlertDescription>{paymentsResult.message}</AlertDescription>
				</Alert>
			) : null}

			{canReadAccounts && accountsResult !== null && !accountsResult.ok ? (
				<Alert>
					<AlertTitle>Could not load payment accounts</AlertTitle>
					<AlertDescription>{accountsResult.message}</AlertDescription>
				</Alert>
			) : null}

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

			<Card>
				<CardHeader>
					<CardTitle>Payment register</CardTitle>
					<CardDescription>
						{payments.length} payment(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PaymentsTable rows={paymentRows} />
				</CardContent>
			</Card>

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
		</section>
	);
}
