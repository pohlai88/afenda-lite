/**
 * Receiving metrics name constants — Rank-1 ERP must not depend on
 * `@afenda/metrics` (R1-B). Apps/web Actions emit these after Result.
 */

export const RECEIVING_METRIC_COMMAND =
	"afenda_receiving_command_total" as const;

export const RECEIVING_METRIC_LABEL_COMMAND = "command" as const;
export const RECEIVING_METRIC_LABEL_OUTCOME = "outcome" as const;

export const RECEIVING_METRIC_OUTCOME_SUCCESS = "success" as const;
export const RECEIVING_METRIC_OUTCOME_FAILURE = "failure" as const;

export const RECEIVING_METRIC_COMMAND_CREATE = "create" as const;
export const RECEIVING_METRIC_COMMAND_LINE_ADD = "line_add" as const;
export const RECEIVING_METRIC_COMMAND_POST = "post" as const;
export const RECEIVING_METRIC_COMMAND_CANCEL = "cancel" as const;
export const RECEIVING_METRIC_COMMAND_REVERSE = "reverse" as const;
export const RECEIVING_METRIC_COMMAND_DISCREPANCY_RECORD =
	"discrepancy_record" as const;
export const RECEIVING_METRIC_COMMAND_DISCREPANCY_RESOLVE =
	"discrepancy_resolve" as const;

export const RECEIVING_METRIC_RECEIPTS_CREATED =
	"receiving_receipts_created_total" as const;
export const RECEIVING_METRIC_RECEIPTS_POSTED =
	"receiving_receipts_posted_total" as const;
export const RECEIVING_METRIC_RECEIPTS_CANCELLED =
	"receiving_receipts_cancelled_total" as const;
export const RECEIVING_METRIC_RECEIPTS_REVERSED =
	"receiving_receipts_reversed_total" as const;
export const RECEIVING_METRIC_DISCREPANCIES_RECORDED =
	"receiving_discrepancies_recorded_total" as const;
export const RECEIVING_METRIC_OVER_TOLERANCE_REJECTIONS =
	"receiving_over_tolerance_rejections_total" as const;
export const RECEIVING_METRIC_PO_STATE_REJECTIONS =
	"receiving_po_state_rejections_total" as const;
export const RECEIVING_METRIC_INVENTORY_APPLICATION_PENDING =
	"receiving_inventory_application_pending_total" as const;
export const RECEIVING_METRIC_IDEMPOTENCY_REPLAYS =
	"receiving_idempotency_replays_total" as const;
