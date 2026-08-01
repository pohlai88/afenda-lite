import { authServer } from "@afenda/auth";
import { listSalesInvoices } from "@afenda/receivables";
import {
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
import { ReceivablesDocumentsTable } from "@/features/receivables/receivables-documents-table";
import {
	AddSalesInvoiceLineForm,
	ApplyCustomerReceiptForm,
	CancelSalesInvoiceForm,
	CreateDraftSalesInvoiceForm,
	IssueCreditNoteForm,
	PostSalesInvoiceForm,
} from "@/features/receivables/receivables-forms";
import { ReceivablesStatusChart } from "@/features/receivables/receivables-status-chart";
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
	const invoiceRows = invoices.map((invoice) => ({
		id: invoice.id,
		code: invoice.code,
		invoiceSource: invoice.invoiceSource,
		status: invoice.status,
		version: invoice.version,
		customer: invoice.customerCode,
		currencyCode: invoice.currencyCode,
		openAmount: invoice.openAmount,
		lineCount: invoice.lines.length,
	}));
	const statusCounts = new Map<string, number>();
	for (const invoice of invoices) {
		statusCounts.set(
			invoice.status,
			(statusCounts.get(invoice.status) ?? 0) + 1,
		);
	}
	const statusDistribution = [...statusCounts]
		.map(([status, documents]) => ({ status, documents }))
		.sort((left, right) => left.status.localeCompare(right.status));

	return (
		<WorkspacePage>
			<WorkspacePageHeader
				description="Create and post sales invoices, issue credit notes, apply customer receipts, and track open balances."
				scope={`${surface === "admin" ? "Operator" : "Client"} · Receivables`}
				title="Customer receivables"
			/>
			<WorkspacePageContent>
				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Lifecycle distribution</CardTitle>
						<CardDescription>
							A count-based view of the same permission-scoped page shown below.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ReceivablesStatusChart data={statusDistribution} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Sales invoices and credit notes</CardTitle>
						<CardDescription>
							{invoices.length} document(s) · pageSize ≤ 50
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ReceivablesDocumentsTable
							error={invoicesResult.ok ? undefined : invoicesResult.message}
							rows={invoiceRows}
						/>
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
