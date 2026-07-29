import type { ClockPort } from "./ports";
export function createSystemClock(): ClockPort {
	return { now: () => new Date() };
}
