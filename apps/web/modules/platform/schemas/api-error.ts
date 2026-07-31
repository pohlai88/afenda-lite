import type { errorProject } from "@afenda/errors";

export type APIErrorBody = ReturnType<typeof errorProject.http>["body"];

/** Route Handler success envelope (API-001) — helpers named `apiData` / `healthJson`. */
export function apiData<T>(data: T): { data: T } {
	return { data };
}

export const healthJson = apiData;
