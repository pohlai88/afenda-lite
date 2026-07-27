/**
 * # Merge Authorization
 *
 * Merge is a governed domain transition, not a data-cleanup shortcut.
 *
 * A party merge must require:
 *
 * - an approved merge request
 * - the required merge permission
 * - source and target in the same organization
 * - distinct source and target IDs
 * - current source and target versions
 * - compatible lifecycle states
 * - canonical target selection
 * - duplicate evidence or an explicit merge reason
 * - conflict-resolution decisions
 * - prevention of cycles and invalid merge chains
 *
 * ## Merge Effects
 *
 * An approved merge may:
 *
 * - mark the source as merged
 * - set `merged_into_id`
 * - prevent new operational references to the source
 * - reconcile approved aliases and external identifiers
 * - preserve unresolved conflicts
 * - emit merge audit and domain events
 * - refresh canonical search projections
 *
 * A merge must not:
 *
 * - delete the source record
 * - indiscriminately rewrite historical transactions
 * - silently overwrite conflicting legal identities
 * - move records between organizations
 * - rely on search projection completion as proof of merge completion
 * - recursively merge related records without authorization
 *
 * Historical transactions must preserve the party identity originally recorded.
 *
 * Canonical read models may resolve the current master identity while still exposing the original reference.
 */
export * from "./duplicate-policy";
export * from "./duplicate-warning";
export * from "./merge-conflicts";
export * from "./merge-policy";
