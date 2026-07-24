import { fail } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createVaultDocumentReferenceAdapter } from "../src/compliance/vault-document-reference-adapter";

const ORG = "org-vault-a";

describe("createVaultDocumentReferenceAdapter", () => {
	const adapter = createVaultDocumentReferenceAdapter();

	it("accepts and normalizes a canonical vault reference", async () => {
		const result = await adapter.validateReference({
			organizationId: ORG,
			reference: `vault://organizations/${ORG}/passport/doc-1?version=v2`,
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.documentKind).toBe("passport");
		expect(result.data.documentId).toBe("doc-1");
		expect(result.data.version).toBe("v2");
		expect(result.data.reference).toContain("version=v2");
	});

	it("rejects cross-organization references", async () => {
		const result = await adapter.validateReference({
			organizationId: ORG,
			reference: "vault://organizations/other-org/passport/doc-1",
		});
		expect(result.ok).toBe(false);
	});

	it("rejects unsupported schemes and data URIs", async () => {
		const dataUri = await adapter.validateReference({
			organizationId: ORG,
			reference: "data:text/plain;base64,YQ==",
		});
		expect(dataUri.ok).toBe(false);

		const https = await adapter.validateReference({
			organizationId: ORG,
			reference: "https://example.com/file.pdf",
		});
		expect(https.ok).toBe(false);
	});

	it("rejects malformed vault paths", async () => {
		const result = await adapter.validateReference({
			organizationId: ORG,
			reference: "vault://passport/only-kind",
		});
		expect(result.ok).toBe(false);
	});

	it("rejects disallowed document kinds", async () => {
		const result = await adapter.validateReference({
			organizationId: ORG,
			reference: `vault://organizations/${ORG}/case_evidence/ev-1`,
			allowedKinds: ["passport"],
		});
		expect(result.ok).toBe(false);
	});

	it("requires immutable version when requested", async () => {
		const missing = await adapter.validateReference({
			organizationId: ORG,
			reference: `vault://organizations/${ORG}/passport/doc-1`,
			requireImmutableVersion: true,
		});
		expect(missing.ok).toBe(false);

		const present = await adapter.validateReference({
			organizationId: ORG,
			reference: `vault://organizations/${ORG}/passport/doc-1?version=1`,
			requireImmutableVersion: true,
		});
		expect(present.ok).toBe(true);
	});

	it("delegates to an injected object resolver when present", async () => {
		const withResolver = createVaultDocumentReferenceAdapter({
			resolver: {
				async assertObjectAcceptable() {
					return fail("CONFLICT", "Object quarantined");
				},
			},
		});
		const result = await withResolver.validateReference({
			organizationId: ORG,
			reference: `vault://organizations/${ORG}/passport/doc-1`,
		});
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toContain("quarantined");
	});
});
