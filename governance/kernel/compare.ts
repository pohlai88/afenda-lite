/** ASCII ordinal compare for stable, locale-independent identifier ordering. */
export const compareAsciiOrdinal = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
};
