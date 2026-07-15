import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

/**
 * Single Zod instance extended for OPEN-001 generation.
 * Schema modules and `scripts/generate-openapi.mts` must import `z` from here
 * so registry.register can call `.openapi()` on the same prototype.
 */
extendZodWithOpenApi(z);

export { z };
