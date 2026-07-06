import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  surveyAnswersSchema,
  uuidSchema,
} from "@/lib/schemas/common";

export const acceptClientInviteSchema = z
  .object({
    token: z.string().trim().min(1).max(200),
    password: z.string().min(8).max(512),
    confirmPassword: z.string().min(8).max(512),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export const clientOnboardingSchema = z.object({
  phone: z.string().trim().min(1).max(50),
  entityName: z.string().trim().min(1).max(500),
  jurisdiction: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000),
});

export const submitClientDeclarationSchema = z.object({
  assignmentId: uuidSchema,
  slug: z.string().trim().min(1).max(200),
  answers: surveyAnswersSchema,
});

export const issueClientInviteSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(1).max(500),
  surveyId: z.union([uuidSchema, z.literal("")]).optional(),
  dueDate: z.string().trim().max(50).optional(),
});

export { signInSchema as clientSignInSchema } from "@/lib/schemas/auth";
