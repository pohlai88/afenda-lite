import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	evaluateTrustedDomains,
	extractTrustedOrigins,
	isOriginTrusted,
	normalizeOrigin,
} from "./neon-auth-trusted-domains.mjs";

describe("Neon Auth trusted-domain helpers", () => {
	it("normalizes schemes, hosts, default ports, and trailing slashes", () => {
		assert.equal(normalizeOrigin(" EXAMPLE.com/// "), "https://example.com");
		assert.equal(
			normalizeOrigin("https://EXAMPLE.com:443/"),
			"https://example.com",
		);
		assert.equal(
			normalizeOrigin("http://EXAMPLE.com:3000/"),
			"http://example.com:3000",
		);
	});

	it("extracts and deduplicates supported Neon response shapes", () => {
		assert.deepEqual(
			extractTrustedOrigins({
				domains: [
					{ domain: "https://example.com/" },
					{ origin: "https://EXAMPLE.com" },
					{ url: "http://localhost:3000/" },
				],
			}),
			["https://example.com", "http://localhost:3000"],
		);
		assert.deepEqual(extractTrustedOrigins({ data: ["example.net"] }), [
			"https://example.net",
		]);
	});

	it("matches exact origins and one-label host wildcards by protocol", () => {
		const trusted = ["https://example.com", "https://*.vercel.app"];
		assert.equal(isOriginTrusted("https://example.com/", trusted), true);
		assert.equal(isOriginTrusted("https://preview.vercel.app", trusted), true);
		assert.equal(isOriginTrusted("http://preview.vercel.app", trusted), false);
		assert.equal(isOriginTrusted("https://a.b.vercel.app", trusted), false);
	});

	it("requires both the application origin and a local development origin", () => {
		const passing = evaluateTrustedDomains({
			appUrl: "https://www.nexuscanon.com",
			trustedOrigins: ["https://www.nexuscanon.com", "http://localhost:3000"],
		});
		assert.equal(passing.ok, true);

		const failing = evaluateTrustedDomains({
			appUrl: "https://www.nexuscanon.com",
			trustedOrigins: [],
		});
		assert.equal(failing.ok, false);
		assert.deepEqual(
			failing.issues.map((issue) => issue.code),
			["APP_URL_NOT_TRUSTED", "LOCAL_ORIGIN_NOT_TRUSTED"],
		);
	});
});
