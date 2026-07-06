import { z } from "zod";
import { emailSchema, uuidSchema } from "@/lib/schemas/common";

export const surveyIdParamSchema = uuidSchema;

export const recordEmailInvitationSchema = z.object({
  surveyId: uuidSchema,
  email: emailSchema,
});
