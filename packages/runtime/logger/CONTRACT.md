# Logger kernel contract

`@afenda/logger` is the canonical owner of structured log fields, sensitive-name redaction, and Node/edge record projection.

The permanent capability is `logger.event(entry, options?)` plus `logger.redactFieldValue(name, value)`, exported with the same types from the root Node entrypoint and the isolated `./edge` entrypoint. The structured event registry requires `level`, `event`, and `correlationId`; optional domain context is closed to the fields documented in the package README.

`@afenda/http` owns correlation creation and transport. Calling domains own event names, canonical codes, context values, and emission decisions. They may carry these values but must not reinterpret shared field, redaction, service, timestamp, or sink policy.

Historical constructors and standalone emitters are intentionally unreadable: there is no alias policy because logging calls are in-process capabilities rather than persisted or wire data. The final cutover deleted those surfaces and the app-local forwarding module. Repository gates reject their return, direct Pino consumers, workspace runtime dependencies, and Node/Pino leakage into the edge graph.
