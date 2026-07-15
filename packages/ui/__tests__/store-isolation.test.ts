import { describe, expect, it } from "vitest";

import { createSettingsStore } from "../src/stores/settings";
import { createUserStore } from "../src/stores/users";

describe("provider-scoped store factories", () => {
	it("creates independent settings stores", () => {
		const first = createSettingsStore({ mode: "light" });
		const second = createSettingsStore({ mode: "dark" });

		first.getState().updateSettings({ layout: "full" });

		expect(first.getState().settings.layout).toBe("full");
		expect(second.getState().settings.layout).toBe("compact");
		expect(second.getState().settings.mode).toBe("dark");
	});

	it("uses injected user state instead of package fixtures", () => {
		const first = createUserStore({ users: [] });
		const second = createUserStore({ users: [] });

		first.getState().setRowsPerPage(25);

		expect(first.getState().rowsPerPage).toBe(25);
		expect(second.getState().rowsPerPage).toBe(10);
		expect(second.getState().users).toEqual([]);
	});
});
