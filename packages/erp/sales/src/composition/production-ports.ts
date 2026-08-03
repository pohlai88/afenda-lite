import type { ClockPort } from "../kernel/contracts/ports";
export function createSystemClock(): ClockPort {
	return { now: () => new Date() };
}
