# Sales Capability Boundaries

The capability folders form one `@afenda/sales` authority. They are not public subpath APIs. Consumers import the root barrel; production adapters and testing support use their declared package exports.

- `commercial-pricing`: effective price selection and calculation evidence.
- `quotation-management`: revisioned pre-order commitments and conversion.
- `order-management`: authoritative customer orders and release projections.
- `approvals-and-holds`: orthogonal blocking controls.
- `return-authorizations`: commercial return intent, not physical receipt or credit-note creation.
- `integration-projections`: atomic audit/outbox evidence helpers.
