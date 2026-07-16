/**
 * Flat-barrel naming discipline (afenda-elite-ui-compose Risk 3).
 * Exact vague names shorten the useful life of a single barrel.
 */

import { describe, expect, it } from "vitest";

import * as ui from "../src/index";

/** Exact export names banned — compounds like DropdownMenuItem are allowed. */
const VAGUE_EXPORT_NAMES = new Set([
	"Panel",
	"Container",
	"Box",
	"Item",
	"Wrapper",
	"View",
]);

describe("@afenda/ui-system — export naming (flat barrel)", () => {
	it("rejects vague exact export names (Panel/Container/Box/Item/Wrapper/View)", () => {
		const offenders = Object.keys(ui).filter((name) =>
			VAGUE_EXPORT_NAMES.has(name),
		);
		expect(
			offenders,
			`Vague barrel exports (use role-clear names): ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
