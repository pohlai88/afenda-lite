import { describe, expect, it } from "vitest";

import {
	canonicalSerialize,
	createCorporateAdministrationRequestFingerprint,
	deriveCaCommandFingerprint,
	deriveCaRequestFingerprint,
} from "../src/shared/fingerprint";

describe("@afenda/corporate-administration shared/fingerprint", () => {
	describe("canonicalSerialize", () => {
		it("sorts object keys for stable serialization", () => {
			expect(canonicalSerialize({ b: 1, a: 2 })).toBe(
				canonicalSerialize({ a: 2, b: 1 }),
			);
		});

		it("NFKC-trims strings before serialization", () => {
			const normalized = canonicalSerialize({ name: "  acme\u00a0holdings  " });
			const raw = canonicalSerialize({ name: "acme holdings" });
			expect(normalized).toBe(raw);
		});

		it("omits object keys whose values are undefined", () => {
			expect(
				canonicalSerialize({ keep: 1, drop: undefined }),
			).toBe(canonicalSerialize({ keep: 1 }));
		});
	});

	describe("createCorporateAdministrationRequestFingerprint", () => {
		it("returns a 64-character lowercase hex digest", () => {
			const fingerprint = createCorporateAdministrationRequestFingerprint({
				command: "create",
				code: "ACME",
			});
			expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
		});

		it("is stable for the same canonical material", () => {
			const material = { z: 3, a: 1, nested: { y: 2, x: 1 } };
			expect(
				createCorporateAdministrationRequestFingerprint(material),
			).toBe(createCorporateAdministrationRequestFingerprint(material));
		});

		it("rejects non-finite numbers", () => {
			expect(() =>
				createCorporateAdministrationRequestFingerprint({
					amount: Number.NaN,
				}),
			).toThrow("Cannot fingerprint a non-finite number.");
		});

		it("rejects unsupported value types", () => {
			expect(() =>
				createCorporateAdministrationRequestFingerprint({
					tag: Symbol("x"),
				}),
			).toThrow("Unsupported fingerprint value: symbol");
		});
	});

	describe("deriveCaCommandFingerprint", () => {
		it("scopes material under the command discriminator and strips wire keys", () => {
			const material = {
				organizationId: "org-1",
				legalCompanyId: "co-1",
				code: "GB-1",
			};
			const withWire = {
				...material,
				actorUserId: "user-1",
				correlationId: "corr-1",
				idempotencyKey: "idem-1",
			};

			expect(
				deriveCaCommandFingerprint({ command: "ca.governance.body.create" }, material),
			).toBe(
				deriveCaCommandFingerprint(
					{ command: "ca.governance.body.create" },
					withWire,
				),
			);
		});

		it("changes when the command discriminator changes", () => {
			const input = {
				organizationId: "org-1",
				legalCompanyId: "co-1",
				code: "GB-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				idempotencyKey: "idem-1",
			};

			expect(
				deriveCaCommandFingerprint({ command: "ca.governance.body.create" }, input),
			).not.toBe(
				deriveCaCommandFingerprint({ command: "ca.governance.body.amend" }, input),
			);
		});
	});

	describe("deriveCaRequestFingerprint", () => {
		it("ignores idempotency and correlation context keys", () => {
			const base = {
				organizationId: "org-1",
				code: "ACME",
				legalName: "Acme Holdings",
			};
			const withContext = {
				...base,
				idempotencyKey: "idem-1",
				correlationId: "corr-1",
				causationId: "cause-1",
			};

			expect(deriveCaRequestFingerprint(base)).toBe(
				deriveCaRequestFingerprint(withContext),
			);
		});
	});
});
