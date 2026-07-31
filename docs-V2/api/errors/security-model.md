# Error security model

The kernel treats exceptions, vendor objects, wire envelopes, public result
objects, aliases, and correlation identifiers as untrusted input.

Trusted `Failure` identity is held privately. Forged objects cannot become
trusted by matching a shape or global symbol.

Public output is registry-constrained:

- internal failures use fixed wording;
- public details are code-specific and closed;
- correlation identifiers are bounded and normalized;
- field paths and messages are bounded;
- retry timing is branded and bounded;
- diagnostics contain only approved operational fields;
- PostgreSQL diagnostics retain only an approved source and SQLSTATE;
- wire output contains no cause, stack, SQL, credentials, tenant data, or
  arbitrary vendor payload.

HTTP, Result, wire, and OpenAPI projections share the same public-data policy.
That parity prevents a safer route handler from coexisting with a leaking
serializer or schema.

Hostile accessors, cyclic input, malformed envelopes, unrecognized aliases, and
unknown SQLSTATE values fail closed.
