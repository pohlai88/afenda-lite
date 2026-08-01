import { authServer } from "@afenda/auth";
import { listSupplierInvoices } from "@afenda/payables";
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
import { PayablesDocumentsTable } from "@/features/payables/payables-documents-table";
import {
	AddSupplierCreditNoteLineForm,
	AddSupplierInvoiceLineForm,
	ApplySupplierCreditForm,
	ApplySupplierPaymentForm,
	CancelSupplierInvoiceForm,
	CreateDraftSupplierCreditNoteForm,
	CreateDraftSupplierInvoiceForm,
	IssueSupplierCreditNoteForm,
	MatchSupplierInvoiceForm,
	PostSupplierCreditNoteForm,
	PostSupplierInvoiceForm,
	ReverseSupplierPaymentApplicationForm,
} from "@/features/payables/payables-forms";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

interface PayablesShellProps {
	surface: "admin" | "client";
}

const formSections = [
	["Create draft invoice", CreateDraftSupplierInvoiceForm],
	["Add invoice line", AddSupplierInvoiceLineForm],
	["Match invoice", MatchSupplierInvoiceForm],
	["Post invoice", PostSupplierInvoiceForm],
	["Create draft credit note", CreateDraftSupplierCreditNoteForm],
	["Add credit note line", AddSupplierCreditNoteLineForm],
	["Post credit note", PostSupplierCreditNoteForm],
	["Issue credit note (atomic)", IssueSupplierCreditNoteForm],
	["Apply supplier credit", ApplySupplierCreditForm],
	["Apply supplier payment", ApplySupplierPaymentForm],
	["Reverse payment application", ReverseSupplierPaymentApplicationForm],
	["Cancel invoice", CancelSupplierInvoiceForm],
] as const;

/** Payables console — RSC reads via `@afenda/payables`; mutations via Actions. */
export async function PayablesShell({ surface }: PayablesShellProps) {
	const session =
		surface === "admin"
			? await authServer.session.requireRole("operator")
			: await authServer.session.get();
	await requirePermission(session, "payables.read");
	const canManage = await sessionHasPermission(session, "payables.manage");
	const invoicesResult = await listSupplierInvoices(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			pageSize: 50,
		},
		createPayablesCommandOptions(session.userId),
	);
	const invoices = invoicesResult.ok ? invoicesResult.data : [];
	const invoiceRows = invoices.map((invoice) => ({
		id: invoice.id,
		code: invoice.code,
		documentType: invoice.documentType,
		status: invoice.status,
		version: invoice.version,
		supplier: invoice.supplierCode,
		currencyCode: invoice.currencyCode,
		openAmount: invoice.openAmount,
		lineCount: invoice.lines.length,
	}));

	return (
		<WorkspacePage>
			<WorkspacePageHeader
				description="Create, match, and post supplier invoices, manage credit notes, apply posted payments, and track open balances."
				scope={`${surface === "admin" ? "Operator" : "Client"} · Payables`}
				title="Supplier payables"
			/>
			<WorkspacePageContent>
				<Card>
					<CardHeader>
						<CardTitle>Supplier invoices and credit notes</CardTitle>
						<CardDescription>
							{invoices.length} document(s) · pageSize ≤ 50
						</CardDescription>
					</CardHeader>
					<CardContent>
						<PayablesDocumentsTable
							error={invoicesResult.ok ? undefined : invoicesResult.message}
							rows={invoiceRows}
						/>
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
			</WorkspacePageContent>
		</WorkspacePage>
	);
}
