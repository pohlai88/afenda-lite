import { describe, expect, it } from "vitest";

import { normalizeCompanyName } from "../../src/features/company/index";

describe("company name normalization", () => {
	it("normalizes composed and decomposed accents to the same NFC comparison value", () => {
		expect(normalizeCompanyName("Café Holdings")).toBe(
			normalizeCompanyName("Cafe\u0301 Holdings"),
		);
		expect(normalizeCompanyName("Cafe\u0301 Holdings")).toBe("café holdings");
	});

	it("normalizes whitespace, width and mixed Latin case without changing non-equivalent scripts", () => {
		expect(normalizeCompanyName("  Alpha   HOLDINGS  ")).toBe("alpha holdings");
		expect(normalizeCompanyName("ＡＦＥＮＤＡ Holdings")).toBe(
			"ａｆｅｎｄａ holdings",
		);
		expect(normalizeCompanyName("阿芬达控股")).toBe("阿芬达控股");
		expect(normalizeCompanyName("Syarikat Berhad")).not.toBe(
			normalizeCompanyName("Công ty Berhad"),
		);
		expect(normalizeCompanyName("شركة أفيندا")).toBe("شركة أفيندا");
	});
});
