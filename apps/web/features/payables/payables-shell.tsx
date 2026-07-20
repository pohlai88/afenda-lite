import { getSession, requireRole } from "@afenda/auth";
import { listSupplierInvoices } from "@afenda/payables";
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
	AddSupplierInvoiceLineForm,
	AllocateSupplierPaymentForm,
	CancelSupplierInvoiceForm,
	CreateDraftSupplierInvoiceForm,
	IssueSupplierCreditNoteForm,
	MatchSupplierInvoiceForm,
	PostSupplierInvoiceForm,
} from "@/features/payables/payables-forms";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

type PayablesShellProps = { surface: "admin" | "client" };

const formSections = [
	["Create draft invoice", CreateDraftSupplierInvoiceForm],
	["Add invoice line", AddSupplierInvoiceLineForm],
	["Match invoice", MatchSupplierInvoiceForm],
	["Post invoice", PostSupplierInvoiceForm],
	["Issue credit note", IssueSupplierCreditNoteForm],
	["Allocate supplier payment", AllocateSupplierPaymentForm],
	["Cancel invoice", CancelSupplierInvoiceForm],
] as const;

/** Payables console — RSC reads via `@afenda/payables`; mutations via Actions. */
export async function PayablesShell({ surface }: PayablesShellProps) {
	const session =
		surface === "admin" ? await requireRole("operator") : await getSession();
	await requirePermission(session, "payables.read");
	const canManage = await sessionHasPermission(session, "payables.manage");
	const invoicesResult = await listSupplierInvoices(
		{
			organizationId: session.orgId,
			actorUserId: session.userId,
			pageSize: 50,
		},
		createPayablesCommandOptions(),
	);
	const invoices = invoicesResult.ok ? invoicesResult.data : [];

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					{surface === "admin" ? "Operator" : "Client"} · Payables
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">
					Supplier payables
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Create, match, and post supplier invoices, issue credit notes,
					allocate payments, and track open balances.
				</p>
			</div>

			{!invoicesResult.ok ? (
				<Alert>
					<AlertTitle>Could not load supplier invoices</AlertTitle>
					<AlertDescription>{invoicesResult.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Supplier invoices and credit notes</CardTitle>
					<CardDescription>
						{invoices.length} document(s) · pageSize ≤ 50
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					{invoices.length === 0 ? (
						<p className="text-muted-foreground">No payables documents yet.</p>
					) : (
						<ul className="space-y-2">
							{invoices.map((invoice) => (
								<li key={invoice.id} className="rounded-md border px-3 py-2">
									<div className="font-medium">
										{invoice.code} · {invoice.documentType} · {invoice.status} ·
										v{invoice.version}
									</div>
									<div className="text-muted-foreground">
										id <Code>{invoice.id}</Code> · {invoice.supplierCode} ·{" "}
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
