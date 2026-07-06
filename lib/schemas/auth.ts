import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/schemas/common";

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
