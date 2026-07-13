/**
 * Programmatic Spectral ruleset for Afenda-specific OpenAPI conventions.
 *
 * These checks are policy on top of valid OpenAPI (operation identity,
 * lifecycle status, contract-only try-it gating, the `{ data: T }` success
 * envelope, and document-level provenance metadata) — they run as their own
 * Spectral instance/ruleset, separate from the generic `oas` ruleset, so
 * enabling/disabling them (via `afendaRules`) never changes `oas`'s own
 * rule set or severities.
 *
 * `given` targeting uses the same compound bracket pattern as Stoplight's
 * own `oas` ruleset aliases (`PathItem`/`OperationObject`/`ResponseObject`
 * in @stoplight/spectral-rulesets), inlined here since this ruleset only
 * needs it in one or two places. `jsonpath-plus` is used only inside the
 * response-envelope function, where Spectral's own `given` JSONPath has no
 * way to declaratively select "every response.content[*].schema" *and*
 * report the exact JSON path of the specific media-type schema at fault —
 * Spectral's `then.field` only supports one literal key, not a wildcard.
 */
import { JSONPath } from "jsonpath-plus";

const OPERATION_GIVEN = "$.paths[*][get,put,post,patch,delete,options,head,trace]";
const RESPONSE_GIVEN = `${OPERATION_GIVEN}.responses[*]`;

function operationContext(context) {
  const [, route, method] = context.path;
  return { route, method: String(method).toUpperCase() };
}

// Schemas arriving here are already dereferenced by Spectral's default
// resolver (rule `resolved` defaults to true), so this only needs to walk
// JSON Schema composition — no $ref handling required.
function schemaHasTopLevelProperty(schema, property, seen = new Set()) {
  if (!schema || typeof schema !== "object" || seen.has(schema)) return false;
  seen.add(schema);
  if (schema.properties?.[property]) return true;
  return ["allOf", "anyOf", "oneOf"].some((keyword) =>
    (schema[keyword] ?? []).some((part) => schemaHasTopLevelProperty(part, property, seen)),
  );
}

function schemaContainsReference(schema, seen = new Set()) {
  if (!schema || typeof schema !== "object" || seen.has(schema)) return false;
  seen.add(schema);
  if (typeof schema.$ref === "string") return true;
  return Object.values(schema).some((value) =>
    Array.isArray(value)
      ? value.some((entry) => schemaContainsReference(entry, seen))
      : schemaContainsReference(value, seen),
  );
}

function afendaOperationId(operation, _opts, context) {
  if (operation.operationId) return;
  const { route, method } = operationContext(context);
  return [{ message: `${method} ${route}: missing operationId` }];
}

function afendaOperationStatus(operation, _opts, context) {
  if (operation["x-afenda-status"]) return;
  const { route, method } = operationContext(context);
  return [{ message: `${method} ${route}: missing x-afenda-status` }];
}

function afendaContractOnlyTryIt(operation, _opts, context) {
  if (operation["x-afenda-status"] !== "contract-only") return;
  if (operation["x-afenda-try-it"] === false) return;
  const { route, method } = operationContext(context);
  return [{ message: `${method} ${route}: contract-only operation must set x-afenda-try-it: false` }];
}

function afendaResponseEnvelope(response, _opts, context) {
  const status = String(context.path.at(-1) ?? "");
  const isSuccess = /^2\d\d$/.test(status);
  const isError = /^[45]\d\d$/.test(status) || /^(?:default|[45]xx)$/i.test(status);
  if (!isSuccess && !isError) return;

  const [, route, method] = context.path;
  const label = `${String(method).toUpperCase()} ${route} ${status}`;
  const schemaMatches = JSONPath({ path: "$.content[*].schema", json: response, resultType: "all" });

  if (schemaMatches.length === 0) {
    return [{ message: `${label}: response has no structured media schema` }];
  }

  const results = [];
  for (const match of schemaMatches) {
    const hasData = schemaHasTopLevelProperty(match.value, "data");
    const unresolved = schemaContainsReference(match.value);
    const schemaPath = [...context.path, ...JSONPath.toPathArray(match.path).slice(1)];
    if (isSuccess && !hasData && !unresolved) {
      results.push({ message: `${label}: success schema lacks top-level data`, path: schemaPath });
    }
    if (isError && hasData) {
      results.push({ message: `${label}: error schema is nested under data`, path: schemaPath });
    }
  }
  return results.length ? results : undefined;
}

function afendaDocumentMetadata(document) {
  if (!document["x-afenda-document"]) {
    return [{ message: "document: missing x-afenda-document metadata" }];
  }
  const results = [];
  for (const field of ["id", "version", "generatedAt"]) {
    if (!document["x-afenda-document"][field]) {
      results.push({ message: `document: x-afenda-document.${field} is required` });
    }
  }
  return results.length ? results : undefined;
}

// `message: "{{error}}"` is required on every rule: Spectral's default (no
// `message` set) prefers `rule.description` over the function's own
// per-violation message, which would collapse all per-operation/per-status
// evidence down to one generic sentence per rule. `{{error}}` selects the
// exact string returned by `then.function` instead.
const USE_FUNCTION_MESSAGE = "{{error}}";

export const afendaOpenApiRuleset = {
  rules: {
    "afenda-operation-id": {
      description: "Every OpenAPI operation must declare a stable operationId.",
      message: USE_FUNCTION_MESSAGE,
      severity: "error",
      given: OPERATION_GIVEN,
      then: { function: afendaOperationId },
    },
    "afenda-operation-status": {
      description: "Every OpenAPI operation must declare x-afenda-status.",
      message: USE_FUNCTION_MESSAGE,
      severity: "error",
      given: OPERATION_GIVEN,
      then: { function: afendaOperationStatus },
    },
    "afenda-contract-only-try-it": {
      description: "contract-only operations must set x-afenda-try-it: false.",
      message: USE_FUNCTION_MESSAGE,
      severity: "error",
      given: OPERATION_GIVEN,
      then: { function: afendaContractOnlyTryIt },
    },
    "afenda-response-envelope": {
      description: "2xx responses use { data: T }; 4xx/5xx/default responses must not nest under data.",
      message: USE_FUNCTION_MESSAGE,
      severity: "error",
      given: RESPONSE_GIVEN,
      then: { function: afendaResponseEnvelope },
    },
    "afenda-document-metadata": {
      description: "The OpenAPI document must declare x-afenda-document provenance metadata.",
      message: USE_FUNCTION_MESSAGE,
      severity: "error",
      given: "$",
      then: { function: afendaDocumentMetadata },
    },
  },
};
