/**
 * Purchasing metrics name constants — Rank-1 ERP must not depend on
 * `@afenda/metrics` (R1-B). Apps/web Actions emit these after Result.
 */

export const PURCHASING_METRIC_COMMAND = "afenda_purchasing_command_total" as const;

/** Label keys for `PURCHASING_METRIC_COMMAND`. */
export const PURCHASING_METRIC_LABEL_COMMAND = "command" as const;
export const PURCHASING_METRIC_LABEL_OUTCOME = "outcome" as const;

export const PURCHASING_METRIC_OUTCOME_SUCCESS = "success" as const;
export const PURCHASING_METRIC_OUTCOME_FAILURE = "failure" as const;

export const PURCHASING_METRIC_COMMAND_CREATE = "create" as const;
export const PURCHASING_METRIC_COMMAND_LINE_ADD = "line_add" as const;
export const PURCHASING_METRIC_COMMAND_POST = "post" as const;
export const PURCHASING_METRIC_COMMAND_CANCEL = "cancel" as const;
export const PURCHASING_METRIC_COMMAND_CLOSE = "close" as const;
