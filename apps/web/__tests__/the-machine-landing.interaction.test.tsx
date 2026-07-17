import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MAIN_CONTENT_ID } from "@/features/auth/main-content";
import { TheMachineLandingStage } from "@/features/landing/the-machine-landing-stage";

afterEach(() => {
	cleanup();
});

describe("TheMachineLandingStage interaction", () => {
	it("exposes main landmark, brand, and Sign in CTA", () => {
		render(<TheMachineLandingStage />);
		expect(document.getElementById(MAIN_CONTENT_ID)).not.toBeNull();
		expect(
			screen.getByRole("heading", { level: 1, name: /machine/i }),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
			"href",
			"/auth/login",
		);
	});

	it("toggles sensor reaction on click and Escape", async () => {
		const user = userEvent.setup();
		render(<TheMachineLandingStage />);
		const sensor = screen.getByRole("button", {
			name: "Activate the Machine",
		});
		await user.click(sensor);
		expect(
			screen.getByRole("button", { name: "Reset the Machine" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByText("Response active")).toBeTruthy();
		await user.keyboard("{Escape}");
		expect(
			screen.getByRole("button", { name: "Activate the Machine" }),
		).toHaveAttribute("aria-pressed", "false");
	});
});
