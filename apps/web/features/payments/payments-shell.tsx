import { getSession, requireRole } from "@afenda/auth";
import { listPayments } from "@afenda/payments";
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
import {
	AddPaymentAllocationForm,
	CreateDraftPaymentForm,
	PostPaymentForm,
	PostRefundForm,
	ReversePaymentForm,
} from "@/features/payments/payments-forms";
import { PaymentsTable } from "@/features/payments/payments-table";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type PaymentsShellProps = { surface: "admin" | "client" };

const formSections = [
	["Create draft payment", CreateDraftPaymentForm],
	["Add allocation", AddPaymentAllocationForm],
	["Post payment", PostPaymentForm],
	["Reverse payment", ReversePaymentForm],
	["Post refund", PostRefundForm],
] as const;

/** Payments console — RSC reads via `@afenda/payments`; mutations via Actions. */
export async function PaymentsShell({ surface }: PaymentsShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "payments.read");
	const canManage = await sessionHasPermission(session, "payments.manage");
	const paymentsResult = await listPayments(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			pageSize: 50,
		},
		createPaymentsCommandOptions(),
	);
	const payments = paymentsResult.ok ? paymentsResult.data : [];
	const paymentRows = payments.map((payment) => ({
		id: payment.id,
		code: payment.code,
		direction: payment.direction,
		status: payment.status,
		version: payment.version,
		currencyCode: payment.currencyCode,
		amount: payment.amount,
		allocationCount: payment.allocations.length,
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

			{formSections.map(([title, Form]) => (
				<Card key={title}>
					<CardHeader>
						<CardTitle>{title}</CardTitle>
					</CardHeader>
					<CardContent>
						<Form canManage={canManage} />
					</CardContent>
				</Card>
			))}
		</section>
	);
}
