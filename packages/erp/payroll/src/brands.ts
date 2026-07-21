import { z } from "zod";

export const payrollRunIdSchema = z.string().uuid().brand<"PayrollRunId">();
export type PayrollRunId = z.infer<typeof payrollRunIdSchema>;
