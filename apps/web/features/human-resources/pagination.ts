import { z } from "zod";

export const HR_PAGE_SIZE = 25;

const pageSchema = z.coerce.number().int().positive().max(10_000).catch(1);

export function parseHrPage(value?: string | string[]): number {
	return pageSchema.parse(Array.isArray(value) ? value[0] : value);
}
