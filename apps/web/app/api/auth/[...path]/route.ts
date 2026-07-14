import { createAuthApiHandlers } from "@afenda/auth";

/**
 * Neon Auth BFF proxy — `/api/auth/[...path]` (ARCH-026 · GUIDE-018 I1.2).
 * SDK usage stays inside `@afenda/auth` via `createAuthApiHandlers`.
 */
export const { GET, POST } = createAuthApiHandlers();
