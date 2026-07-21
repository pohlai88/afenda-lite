import { z } from "zod";

export const humanResourcesEmployeeIdSchema = z
	.string()
	.uuid()
	.brand<"HumanResourcesEmployeeId">();
export type HumanResourcesEmployeeId = z.infer<
	typeof humanResourcesEmployeeIdSchema
>;
