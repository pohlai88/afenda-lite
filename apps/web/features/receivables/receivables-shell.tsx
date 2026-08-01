import { authServer } from "@afenda/auth";
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
	WorkspacePage,
	WorkspacePageContent,
	WorkspacePageHeader,
} from "@afenda/ui-system";

import { requirePermission } from "@/features/auth/require-permission";
import {
	AddSalesInvoiceLineForm,
	ApplyCustomerReceiptForm,
	CancelSalesInvoiceForm,
	CreateDraftSalesInvoiceForm,
	IssueCreditNoteForm,
	PostSalesInvoiceForm,
} from "@/features/receivables/receivables-forms";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

interface ReceivablesShellProps {
	surface: "admin" | "client";
}

const formSections = [
	[
		"Create draft invoice",
		CreateDraftSalesInvoiceForm,
		"receivables.invoice.create",
	],
	["Add invoice line", AddSalesInvoiceLineForm, "receivables.invoice.update"],
	["Post invoice", PostSalesInvoiceForm, "receivables.invoice.post"],
	["Issue credit note", IssueCreditNoteForm, "receivables.credit_note.issue"],
	[
		"Apply customer receipt",
		ApplyCustomerReceiptForm,
		"receivables.receipt.apply",
	],
	[
		"Cancel draft invoice",
		CancelSalesInvoiceForm,
		"receivables.invoice.cancel",
	],
] as const;

/** Receivables console — RSC reads via `@afenda/receivables`; mutations via Actions. */
export async function ReceivablesShell({ surface }: ReceivablesShellProps) {
	const session =
		surface === "admin"
			? await authServer.session.requireRole("operator")
			: await authServer.session.get();
	await requirePermission(session, "receivables.invoice.read");
	const formPermissions = await Promise.all(
		formSections.map(([, , permission]) =>
			sessionHasPermission(session, permission),
		),
	);
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
		<WorkspacePage>
			<WorkspacePageHeader
				description="Create and post sales invoices, issue credit notes, apply customer receipts, and track open balances."
				scope={`${surface === "admin" ? "Operator" : "Client"} · Receivables`}
				title="Customer receivables"
			/>
			<WorkspacePageContent>
				{invoicesResult.ok ? null : (
					<Alert>
						<AlertTitle>Could not load sales invoices</AlertTitle>
						<AlertDescription>{invoicesResult.message}</AlertDescription>
					</Alert>
				)}

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
									<li className="rounded-md border px-3 py-2" key={invoice.id}>
										<div className="font-medium">
											{invoice.code} · {invoice.invoiceSource} ·{" "}
											{invoice.status} · v{invoice.version}
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
