import { z } from "zod";

import { emailSchema } from "@/modules/platform/schemas/common";

/**
 * Identity — Path A credential sign-in command Zod SSOT (API-004).
 * Adapter uses `parseSchema` at the Server Action boundary.
 */

export const signInSchema = z.object({
	email: emailSchema,
	password: z.string().min(1).max(256),
	callback: z.string().trim().max(2048).optional(),
});

export type SignInCommand = z.infer<typeof signInSchema>;
