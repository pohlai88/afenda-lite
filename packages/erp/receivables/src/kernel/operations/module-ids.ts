export const RECEIVABLES_COMMAND_INVOICE_CREATE =
	"receivables.invoice.create" as const;
export const RECEIVABLES_COMMAND_INVOICE_LINE_ADD =
	"receivables.invoice.line.add" as const;
export const RECEIVABLES_COMMAND_INVOICE_POST =
	"receivables.invoice.post" as const;
export const RECEIVABLES_COMMAND_CREDIT_NOTE_ISSUE =
	"receivables.credit_note.issue" as const;
export const RECEIVABLES_COMMAND_RECEIPT_APPLY =
	"receivables.receipt.apply" as const;
export const RECEIVABLES_COMMAND_RECEIPT_APPLICATION_REVERSE =
	"receivables.receipt_application.reverse" as const;
export const RECEIVABLES_COMMAND_INVOICE_CANCEL =
	"receivables.invoice.cancel" as const;
export const RECEIVABLES_COMMAND_INVOICE_CLOSE =
	"receivables.invoice.close" as const;

export const RECEIVABLES_QUERY_INVOICE_GET = "receivables.invoice.get" as const;
export const RECEIVABLES_QUERY_INVOICE_LIST =
	"receivables.invoice.list" as const;
export const RECEIVABLES_QUERY_BALANCE_GET = "receivables.balance.get" as const;
export const RECEIVABLES_QUERY_AGING_GET = "receivables.aging.get" as const;

export type ReceivablesCommandId =
	| typeof RECEIVABLES_COMMAND_INVOICE_CREATE
	| typeof RECEIVABLES_COMMAND_INVOICE_LINE_ADD
	| typeof RECEIVABLES_COMMAND_INVOICE_POST
	| typeof RECEIVABLES_COMMAND_CREDIT_NOTE_ISSUE
	| typeof RECEIVABLES_COMMAND_RECEIPT_APPLY
	| typeof RECEIVABLES_COMMAND_RECEIPT_APPLICATION_REVERSE
	| typeof RECEIVABLES_COMMAND_INVOICE_CANCEL
	| typeof RECEIVABLES_COMMAND_INVOICE_CLOSE;

export type ReceivablesQueryId =
	| typeof RECEIVABLES_QUERY_INVOICE_GET
	| typeof RECEIVABLES_QUERY_INVOICE_LIST
	| typeof RECEIVABLES_QUERY_BALANCE_GET
	| typeof RECEIVABLES_QUERY_AGING_GET;
