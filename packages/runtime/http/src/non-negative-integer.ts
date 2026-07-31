export function toNonNegativeInteger(value: number, label: string): number {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError(
			`@afenda/http ${label} must be a finite non-negative number`,
		);
	}
	return Math.floor(value);
}
