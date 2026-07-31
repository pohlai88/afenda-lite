/**
 * Re-export the shared OpenAPI-extended Zod instance.
 * SSOT: the root `@afenda/openapi` capability.
 */
import { openapi } from "@afenda/openapi";

export const {
	schema: { z },
} = openapi;
