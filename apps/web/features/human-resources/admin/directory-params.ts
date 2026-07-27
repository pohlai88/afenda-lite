import { z } from "zod";

const directoryFieldSchema = z.enum(["name", "employeeNumber"]);

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export function parseAdminEmployeeDirectoryParams(input: {
	page?: string | string[];
	query?: string | string[];
	field?: string | string[];
}) {
	const page = z.coerce.number().int().positive().catch(1).parse(first(input.page));
	const query = z.string().trim().max(200).catch("").parse(first(input.query));
	const field = directoryFieldSchema.catch("name").parse(first(input.field));
	return { page, query, field };
}
