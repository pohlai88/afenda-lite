import { z } from "zod";
import { emailSchema, passwordSchema } from "@/modules/declarations/schemas/common";

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
