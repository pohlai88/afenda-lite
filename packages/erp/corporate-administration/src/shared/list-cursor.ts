export type CompanyListCursor = {
	readonly createdAt: string;
	readonly id: string;
};

export function encodeCompanyListCursor(cursor: CompanyListCursor): string {
	return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCompanyListCursor(
	value: string,
): CompanyListCursor | null {
	try {
		const parsed: unknown = JSON.parse(
			Buffer.from(value, "base64url").toString("utf8"),
		);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"createdAt" in parsed &&
			"id" in parsed &&
			typeof parsed.createdAt === "string" &&
			typeof parsed.id === "string"
		) {
			return { createdAt: parsed.createdAt, id: parsed.id };
		}
	} catch {
		return null;
	}
	return null;
}

export function compareCompaniesForList(
	left: { createdAt: Date; id: string },
	right: { createdAt: Date; id: string },
): number {
	const timeDelta = left.createdAt.getTime() - right.createdAt.getTime();
	if (timeDelta !== 0) return timeDelta;
	return left.id.localeCompare(right.id);
}

export function isAfterCompanyListCursor(
	company: { createdAt: Date; id: string },
	cursor: CompanyListCursor,
): boolean {
	const cursorTime = Date.parse(cursor.createdAt);
	if (company.createdAt.getTime() > cursorTime) return true;
	if (company.createdAt.getTime() < cursorTime) return false;
	return company.id > cursor.id;
}
