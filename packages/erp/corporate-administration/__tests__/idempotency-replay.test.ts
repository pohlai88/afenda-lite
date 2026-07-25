import { describe, expect, it } from "vitest";

import {
	CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE,
	idempotencyFingerprintConflict,
	replayIdempotencyFingerprint,
} from "../src/shared/idempotency-replay";
import { deriveCaCommandFingerprint } from "../src/shared/fingerprint";

describe("@afenda/corporate-administration shared/idempotency-replay", () => {
	it("returns the same conflict message everywhere", () => {
		const conflict = idempotencyFingerprintConflict();
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.message).toBe(CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE);
		}
	});

	it("replays when the fingerprint matches", () => {
		const row = { id: "1", requestFingerprint: "abc" };
		expect(replayIdempotencyFingerprint(row, "abc")).toEqual({
			ok: true,
			data: row,
		});
	});

	it("conflicts when the fingerprint differs", () => {
		const row = { id: "1", requestFingerprint: "abc" };
		expect(replayIdempotencyFingerprint(row, "def")).toEqual(
			idempotencyFingerprintConflict(),
		);
	});
});

describe("governance lifecycle fingerprint parity", () => {
	it("matches deriveCaCommandFingerprint for lifecycle context", () => {
		const input = {
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			idempotencyKey: "idem-1",
			legalCompanyId: "co-1",
			id: "rec-1",
			expectedVersion: 2,
			reason: "amend",
		};
		const command = "ca.governance.officer.amend";

		expect(deriveCaCommandFingerprint({ command }, input)).toBe(
			deriveCaCommandFingerprint({ command }, {
				...input,
				causationId: "cause-ignored",
			}),
		);
	});
});
