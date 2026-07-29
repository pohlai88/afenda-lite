import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useTheme } from "next-themes";
import { afterEach, describe, expect, it } from "vitest";
import {
	type AppShellColorMode,
	AppShellThemeProvider,
} from "../src/app-shell/theme-provider";

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.classList.remove("light", "dark");
	document.documentElement.removeAttribute("data-mode");
	document.documentElement.style.colorScheme = "";
});

function ThemeState() {
	const { resolvedTheme, theme } = useTheme();

	return (
		<output aria-label="Theme state">
			{theme}:{resolvedTheme}
		</output>
	);
}

function ControlledThemeHarness({
	mode,
}: Readonly<{ mode: AppShellColorMode }>) {
	return (
		<AppShellThemeProvider controlledTheme={mode}>
			<ThemeState />
		</AppShellThemeProvider>
	);
}

describe("AppShellThemeProvider", () => {
	it("uses app-shell defaults for class-based system theming", async () => {
		render(
			<AppShellThemeProvider>
				<ThemeState />
			</AppShellThemeProvider>,
		);

		await waitFor(() => {
			expect(screen.getByLabelText("Theme state")).toHaveTextContent(
				"system:light",
			);
		});
		expect(document.documentElement).toHaveClass("light");
		expect(document.documentElement).not.toHaveAttribute("data-theme");
		expect(document.documentElement.style.colorScheme).toBe("light");
	});

	it("honors supported next-themes overrides", async () => {
		render(
			<AppShellThemeProvider
				attribute="data-mode"
				defaultTheme="dark"
				disableTransitionOnChange={false}
				enableSystem={false}
			>
				<ThemeState />
			</AppShellThemeProvider>,
		);

		await waitFor(() => {
			expect(document.documentElement).toHaveAttribute("data-mode", "dark");
		});
		expect(document.documentElement).not.toHaveClass("dark");
	});

	it("synchronizes controlled mode changes without forcing the theme", async () => {
		const view = render(<ControlledThemeHarness mode="light" />);

		await waitFor(() => {
			expect(localStorage.getItem("theme")).toBe("light");
		});
		expect(document.documentElement).toHaveClass("light");

		view.rerender(<ControlledThemeHarness mode="dark" />);

		await waitFor(() => {
			expect(screen.getByLabelText("Theme state")).toHaveTextContent(
				"dark:dark",
			);
		});
		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).not.toHaveClass("light");
		expect(localStorage.getItem("theme")).toBe("dark");
	});
});
