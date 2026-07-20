export type CursorPagination = {
	cursor?: string;
	limit: number;
	direction: "forward" | "backward";
};

export type CursorPage<T> = {
	data: T[];
	nextCursor?: string;
	prevCursor?: string;
	hasMore: boolean;
};

/** Encode a stable cursor from record id + sort value. */
export function encodeCursor(
	id: string,
	sortValue: string | number | Date,
): string {
	const value =
		sortValue instanceof Date ? sortValue.toISOString() : String(sortValue);
	return Buffer.from(`${id}|${value}`, "utf8").toString("base64url");
}

/** Decode a cursor produced by `encodeCursor`. */
export function decodeCursor(cursor: string): {
	id: string;
	sortValue: string;
} {
	const decoded = Buffer.from(cursor, "base64url").toString("utf8");
	const separator = decoded.indexOf("|");
	if (separator < 0) {
		return { id: decoded, sortValue: "" };
	}
	return {
		id: decoded.slice(0, separator),
		sortValue: decoded.slice(separator + 1),
	};
}
