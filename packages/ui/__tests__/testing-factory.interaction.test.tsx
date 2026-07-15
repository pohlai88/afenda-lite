import { describe, expect, it } from "vitest";

import { screen, setupUser } from "../../../testing/react";

describe("testing factory L2 helper", () => {
	it("renders through setupUser", async () => {
		const { user } = setupUser(<button type="button">Ping</button>);
		const button = screen.getByRole("button", { name: "Ping" });
		await user.click(button);
		expect(button).toBeInTheDocument();
	});
});
