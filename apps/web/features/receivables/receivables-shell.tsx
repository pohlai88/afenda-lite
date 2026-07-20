import { getSession, requireRole } from "@afenda/auth";
import { listSalesInvoices } from "@afenda/receivables";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import {
	AddSalesInvoiceLineForm,
	AllocateCustomerReceiptForm,
	CancelSalesInvoiceForm,
	CreateDraftSalesInvoiceForm,
	IssueCreditNoteForm,
	PostSalesInvoiceForm,
} from "@/features/receivables/receivables-forms";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type ReceivablesShellProps = { surface: "admin" | "client" };

const formSections = [
	["Create draft invoice", CreateDraftSalesInvoiceForm],
	["Add invoice line", AddSalesInvoiceLineForm],
	["Post invoice", PostSalesInvoiceForm],
	["Issue credit note", IssueCreditNoteForm],
	["Allocate customer receipt", AllocateCustomerReceiptForm],
	["Cancel invoice", CancelSalesInvoiceForm],
] as const;

/** Receivables console — RSC reads via `@afenda/receivables`; mutations via Actions. */
export async function ReceivablesShell({ surface }: ReceivablesShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "receivables.read");
	const canManage = await sessionHasPermission(session, "receivables.manage");
	const invoicesResult = await listSalesInvoices(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			pageSize: 50,
		},
		createReceivablesCommandOptions(),
	);
	const invoices = invoicesResult.ok ? invoicesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Receivables
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Customer receivables
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Create and post sales invoices, issue credit notes, allocate customer
					receipts, and track open balances.
				</p>
			</div>

			{!invoicesResult.ok ? (
				<Alert>
					<AlertTitle>Could not load sales invoices</AlertTitle>
					<AlertDescription>{invoicesResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Sales invoices and credit notes</CardTitle>
					<CardDescription>
						{invoices.length} document(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{invoices.length === 0 ? (
						<p className="text-muted-foreground">
							No receivables documents yet.
						</p>
					) : (
						<ul className="space-y-2">
							{invoices.map((invoice) => (
								<li key={invoice.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{invoice.code} · {invoice.documentType} · {invoice.status} ·
										v{invoice.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{invoice.id}</Code> · {invoice.customerCode} ·{" "}
										{invoice.currencyCode} {invoice.openAmount} open ·{" "}
										{invoice.lines.length} line(s)
									</div>
								</li>
							))}
						</ul>
					)}
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
