export const SALES_DATABASE_CONSTRAINT_REQUIREMENTS = [
	"All Sales tables carry non-null organization_id and an organization/id unique key.",
	"Master references use organization-aware foreign keys.",
	"Mutable aggregates enforce version > 0.",
	"Quantities, prices, discounts, tax, and totals reject invalid negative or over-fulfilled values.",
	"Document and hold statuses are constrained to their published lifecycle vocabularies.",
	"Business codes and command idempotency keys are unique within an organization.",
] as const;
