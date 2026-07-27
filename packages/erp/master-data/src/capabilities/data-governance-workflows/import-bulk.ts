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
 * Automatic matching should use only approved deterministic identifiers.
 *
 * Recommended order:
 *
 * 1. approved external identifier and source system
 * 2. normalized canonical master code
 * 3. another explicitly configured unique key
 *
 * Fuzzy names, addresses, telephone numbers, and similarity scores must not automatically select update targets.
 *
 * They may create duplicate warnings for operator review.
 *
 * ## Recommended Import Lifecycle
 *
 * ```text
 * uploaded
 *   -> parsed
 *   -> validating
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
 * validation_failed
 * cancelled
 * expired
 * superseded
 * ```
 */
export * from "./import-apply";
export * from "./import-policy";
export * from "./import-types";
export * from "./import-validation";
