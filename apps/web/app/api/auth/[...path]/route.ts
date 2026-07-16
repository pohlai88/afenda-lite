import { createAuthApiHandlers } from "@afenda/auth";

/**
 * Neon Auth BFF proxy — `/api/auth/[...path]` (`AUTH_API_BASE_PATH`, ARCH-026 · N5).
 * SDK usage stays inside `@afenda/auth` via `createAuthApiHandlers`.
 */
export const { GET, POST } = createAuthApiHandlers();
