# Error consumer contract

Import only from `@afenda/errors`.

Use `errorResult.ok` and `errorResult.fail` for deliberate public results. Use
`errorIngress.code` for an opaque known boundary failure. Use
`errorIngress.unknown` or `errorIngress.postgres` exactly once at the owning
exception boundary.

Use `errorProject.result`, `errorProject.http`, `errorProject.retry`, and
`errorProject.diagnostics` instead of copying fields or deriving policy.

Consumers may carry, declare, test, display, and expose canonical codes through
approved projections. They may normalize an owned domain outcome. They may not
derive status, retryability, public wording, operational classification, wire
shape, or post-normalization business behavior from canonical codes.

Public copy is static source text. Validation field messages are static source
text. Unknown or vendor messages never become public copy.

Do not destructure, extract, wrap, or pass capability methods as callbacks. Call
them from their named capability object so governance can verify ownership.

`Result<T, C>` narrows through `ok`. Do not define another shared result
contract. Local private outcomes are permitted when they do not cross the
package boundary.
