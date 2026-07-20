import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "../src/components/ui/combobox";

afterEach(() => {
	cleanup();
});

const OPTIONS = [
	{ value: "a", label: "Ada Lovelace" },
	{ value: "g", label: "Grace Hopper" },
];

describe("Combobox — search callbacks", () => {
	it("fires onSearchChange and client-filters by default", async () => {
		const user = userEvent.setup();
		const onSearchChange = vi.fn();

		render(
			<Combobox
				options={OPTIONS}
				aria-label="Member"
				searchPlaceholder="Search…"
				onSearchChange={onSearchChange}
			/>,
		);

		await user.click(screen.getByRole("combobox", { name: "Member" }));
		await user.type(screen.getByPlaceholderText("Search…"), "grace");

		expect(onSearchChange).toHaveBeenCalled();
		expect(onSearchChange).toHaveBeenLastCalledWith("grace");

		const listbox = screen.getByRole("listbox");
		expect(within(listbox).getByText("Grace Hopper")).toBeInTheDocument();
		expect(within(listbox).queryByText("Ada Lovelace")).not.toBeInTheDocument();
	});

	it("filterMode=none shows all options without local filtering", async () => {
		const user = userEvent.setup();

		render(
			<Combobox
				options={OPTIONS}
				aria-label="Member"
				searchPlaceholder="Search…"
				filterMode="none"
			/>,
		);

		await user.click(screen.getByRole("combobox", { name: "Member" }));
		await user.type(screen.getByPlaceholderText("Search…"), "zzzz");

		const listbox = screen.getByRole("listbox");
		expect(within(listbox).getByText("Ada Lovelace")).toBeInTheDocument();
		expect(within(listbox).getByText("Grace Hopper")).toBeInTheDocument();
	});
});
