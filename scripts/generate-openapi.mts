/**
 * Emit docs/api/OPEN-001-openapi.yaml for api-now HTTP only.
 *
 * Schemas are inlined to match modules/platform/schemas/api-error.ts and
 * modules/declarations/schemas/client.ts (save / GET query draft). When those
 * modules are on disk, prefer importing them instead of drifting copies.
 *
 * @see docs/api/OPEN-001-openapi.md
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { stringify as stringifyYaml } from "yaml";

extendZodWithOpenApi(z);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = join("docs", "api", "OPEN-001-openapi.yaml");
const outPath = process.env.OPENAPI_OUT
  ? process.env.OPENAPI_OUT
  : join(root, OUT_REL);

const uuidSchema = z.string().uuid().openapi({
  description: "UUID v4",
  example: "550e8400-e29b-41d4-a716-446655440000",
});

const surveyAnswersSchema = z
  .record(
    z.string().uuid(),
    z.union([z.boolean(), z.string().max(10_000)]),
  )
  .openapi({ description: "Map of questionId → answer" });

const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

const apiErrorBodySchema = z
  .object({
    error: z.object({
      code: apiErrorCodeSchema,
      message: z.string().min(1),
      details: z.unknown().optional(),
    }),
  })
  .openapi("APIErrorBody");

const livenessSchema = z
  .object({
    status: z.literal("alive"),
    timestamp: z.string().datetime(),
  })
  .openapi("LivenessResponse");

const readinessSchema = z
  .object({
    status: z.enum(["ready", "degraded"]),
    topology: z.string(),
    storage: z.string(),
    connection: z.object({
      pooler: z.boolean(),
      ssl: z.string(),
    }),
    auth: z.enum(["configured", "missing", "degraded"]),
    timestamp: z.string().datetime(),
  })
  .openapi("ReadinessResponse");

const declarationDraftQuerySchema = z
  .object({
    assignmentId: uuidSchema,
  })
  .openapi("DeclarationDraftQuery");

const saveClientDeclarationDraftSchema = z
  .object({
    assignmentId: uuidSchema,
    answers: surveyAnswersSchema,
    stepIndex: z.number().int().min(0).max(10_000),
  })
  .openapi("SaveClientDeclarationDraft");

const declarationDraftGetResponseSchema = z
  .object({
    assignmentId: uuidSchema,
    answers: surveyAnswersSchema,
    stepIndex: z.number().int().min(0),
    savedAt: z.string().datetime().nullable(),
  })
  .openapi("DeclarationDraftGetResponse");

const declarationDraftWriteResponseSchema = z
  .object({
    savedAt: z.string().datetime(),
  })
  .openapi("DeclarationDraftWriteResponse");

/** Runtime success envelope from `healthJson` / `apiData` — always `{ data: T }`. */
function dataEnvelope<T extends z.ZodTypeAny>(inner: T, name: string) {
  return z.object({ data: inner }).openapi(name);
}

const livenessEnvelopeSchema = dataEnvelope(livenessSchema, "LivenessEnvelope");
const readinessEnvelopeSchema = dataEnvelope(
  readinessSchema,
  "ReadinessEnvelope",
);
const declarationDraftGetEnvelopeSchema = dataEnvelope(
  declarationDraftGetResponseSchema,
  "DeclarationDraftGetEnvelope",
);
const declarationDraftWriteEnvelopeSchema = dataEnvelope(
  declarationDraftWriteResponseSchema,
  "DeclarationDraftWriteEnvelope",
);

const registry = new OpenAPIRegistry();

registry.register("APIErrorBody", apiErrorBodySchema);
registry.register("LivenessResponse", livenessSchema);
registry.register("ReadinessResponse", readinessSchema);
registry.register("SaveClientDeclarationDraft", saveClientDeclarationDraftSchema);
registry.register(
  "DeclarationDraftGetResponse",
  declarationDraftGetResponseSchema,
);
registry.register(
  "DeclarationDraftWriteResponse",
  declarationDraftWriteResponseSchema,
);
registry.register("LivenessEnvelope", livenessEnvelopeSchema);
registry.register("ReadinessEnvelope", readinessEnvelopeSchema);
registry.register(
  "DeclarationDraftGetEnvelope",
  declarationDraftGetEnvelopeSchema,
);
registry.register(
  "DeclarationDraftWriteEnvelope",
  declarationDraftWriteEnvelopeSchema,
);

registry.registerComponent("securitySchemes", "neonAuthSession", {
  type: "apiKey",
  in: "cookie",
  name: "session",
  description:
    "Neon Auth client session cookie (browser same-origin). Cookie name here is illustrative — Neon owns the real name.",
});

const errorResponses = {
  400: {
    description: "Bad request",
    content: {
      "application/json": { schema: apiErrorBodySchema },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": { schema: apiErrorBodySchema },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": { schema: apiErrorBodySchema },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": { schema: apiErrorBodySchema },
    },
  },
  422: {
    description: "Validation error",
    content: {
      "application/json": { schema: apiErrorBodySchema },
    },
  },
} as const;

registry.registerPath({
  method: "get",
  path: "/api/health/liveness",
  summary: "Process liveness probe",
  description: "Public process-up check. Optional short public CDN cache.",
  tags: ["Health"],
  responses: {
    200: {
      description: "Process is alive",
      content: {
        "application/json": { schema: livenessEnvelopeSchema },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/health/readiness",
  summary: "Dependency readiness probe",
  description: "DB / auth dependency snapshot. Prefer Cache-Control: no-store.",
  tags: ["Health"],
  responses: {
    200: {
      description: "Ready or degraded snapshot",
      content: {
        "application/json": { schema: readinessEnvelopeSchema },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/client/declaration-draft",
  summary: "Load client declaration draft",
  description:
    "Requires client session + onboarding. Cache-Control: private, no-store. Success body uses `{ data }` envelope.",
  tags: ["DeclarationDraft"],
  security: [{ neonAuthSession: [] }],
  request: {
    query: declarationDraftQuerySchema,
  },
  responses: {
    200: {
      description: "Draft loaded",
      content: {
        "application/json": { schema: declarationDraftGetEnvelopeSchema },
      },
    },
    ...errorResponses,
  },
});

const writeDraftShared = {
  tags: ["DeclarationDraft"] as string[],
  security: [{ neonAuthSession: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: saveClientDeclarationDraftSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Draft saved",
      content: {
        "application/json": { schema: declarationDraftWriteEnvelopeSchema },
      },
    },
    ...errorResponses,
  },
};

registry.registerPath({
  method: "put",
  path: "/api/client/declaration-draft",
  summary: "Persist client declaration draft",
  description:
    "Full draft replace (saveClientDeclarationDraftSchema). Cache-Control: private, no-store.",
  ...writeDraftShared,
});

registry.registerPath({
  method: "patch",
  path: "/api/client/declaration-draft",
  summary: "Persist client declaration draft",
  description:
    "Same write body as PUT when partial fields are not split at the schema. Cache-Control: private, no-store.",
  ...writeDraftShared,
});

registry.registerPath({
  method: "post",
  path: "/api/client/declaration-draft",
  summary: "Persist draft (keepalive alias)",
  description:
    "Keepalive alias of PUT/PATCH with the same body. Cache-Control: private, no-store.",
  ...writeDraftShared,
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Afenda-Lite HTTP (api-now)",
    version: "1.0.0",
    description:
      "Machine OpenAPI for implemented Route Handlers only. Success JSON uses `{ data }` (healthJson / apiData). Errors use APIErrorBody (no data wrapper). Neon Auth `/api/auth/*` is excluded. Contract-only REST lives in REST-001 until handlers exist. One-version rule: no `/api/v1`.",
  },
  servers: [
    {
      url: "https://afenda-lite.vercel.app",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Local next dev",
    },
  ],
  tags: [
    { name: "Health", description: "Public probes" },
    {
      name: "DeclarationDraft",
      description: "Client autosave XHR (api-now)",
    },
  ],
});

const header = [
  "# GENERATED — do not hand-edit.",
  "# Source: scripts/generate-openapi.mts",
  "# Guide: docs/api/OPEN-001-openapi.md",
  "# Regenerate: npm run openapi:generate",
  "",
].join("\n");

writeFileSync(
  outPath,
  `${header}${stringifyYaml(JSON.parse(JSON.stringify(document)), {
    lineWidth: 100,
    aliasDuplicateObjects: false,
  })}\n`,
  "utf8",
);
console.log(`Wrote ${outPath}`);
