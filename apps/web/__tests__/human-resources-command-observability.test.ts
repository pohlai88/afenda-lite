import { describe, expect, it } from "vitest";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

describe("HR command observability production composition", () => {
	it("wires the production observability recorder into command options", () => {
		const options = createHumanResourcesCommandOptions();

		expect(options.observability).toEqual({
			recorder: {
				recordMetric: expect.any(Function),
				recordEvent: expect.any(Function),
			},
			clock: { now: expect.any(Function) },
		});
	});
});
