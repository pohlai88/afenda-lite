/**
 * # Import Workflows
 *
 * ## Supported Modes
 *
 * ```text
 * create_only
 * update_existing
 * create_or_update
 * ```
 *
 * Default:
 *
 * ```text
 * create_or_update
 * ```
 *
 * ## Deterministic Matching
 *
 * Automatic matching uses only approved deterministic identifiers.
 *
 * Supported order:
 *
 * 1. normalized canonical master code
 * 2. approved external identifier and source system
 *
 * Fuzzy names, addresses, telephone numbers, and similarity scores must not automatically select update targets.
 *
 * They may create duplicate warnings for operator review.
 *
 * ## Recommended Import Lifecycle
 *
 * ```text
 * parsed
 *   -> validated
 *   -> approval_pending
 *   -> approved
 *   -> applying
 *       -> applied
 *       -> partially_applied
 *       -> failed
 * ```
 *
 * Other terminal states:
 *
 * ```text
 * cancelled
 * ```
 *
 * Each row carries source row number, raw payload, normalized payload, matched
 * target ID, intended operation, validation errors, application result, and the
 * resulting entity ID/version when application creates or updates a record.
 *
 * Imports are bounded: callers validate row and payload-size limits, keep an
 * immutable source snapshot, process rows or chunks atomically, and use
 * idempotency keys to resume or retry failed rows without replaying successful
 * mutations.
 */
export * from "./import-apply";
export * from "./import-policy";
export * from "./import-types";
export * from "./import-validation";
