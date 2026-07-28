import { expect, userEvent, waitFor, within } from "storybook/test";

export type InteractiveComponent =
	| "accordion"
	| "alert-dialog"
	| "checkbox"
	| "collapsible"
	| "combobox"
	| "column-visibility-menu"
	| "context-menu"
	| "dialog"
	| "dropdown-menu"
	| "drawer"
	| "file-upload"
	| "menubar"
	| "popover"
	| "select"
	| "saved-view-select"
	| "search-field"
	| "sheet"
	| "switch"
	| "tabs"
	| "toggle"
	| "tooltip"
	| "tree-view";

function requiredElement<T extends Element>(element: T | undefined): T {
	if (!element)
		throw new Error("Expected interaction target was not rendered.");
	return element;
}

export function interactionFor(component: InteractiveComponent) {
	return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
		const canvas = within(canvasElement);
		const page = within(canvasElement.ownerDocument.body);

		switch (component) {
			case "accordion":
				await userEvent.click(
					canvas.getByRole("button", { name: "Is it accessible?" }),
				);
				await expect(
					canvas.getByText(/Keyboard and screen-reader/),
				).toBeVisible();
				break;
			case "alert-dialog":
				await userEvent.click(
					canvas.getByRole("button", { name: "Delete record" }),
				);
				await expect(page.getByRole("alertdialog")).toHaveAttribute(
					"data-state",
					"open",
				);
				await userEvent.click(page.getByRole("button", { name: "Cancel" }));
				await waitFor(() =>
					expect(page.queryByRole("alertdialog")).not.toBeInTheDocument(),
				);
				break;
			case "checkbox": {
				const checkbox = requiredElement(canvas.getAllByRole("checkbox")[0]);
				await userEvent.click(checkbox);
				await expect(checkbox).not.toBeChecked();
				break;
			}
			case "collapsible":
				await userEvent.click(
					canvas.getByRole("button", { name: "Toggle details" }),
				);
				await expect(
					canvas.queryByText("Additional audit evidence appears here."),
				).not.toBeInTheDocument();
				break;
			case "combobox":
				await userEvent.click(canvas.getByRole("combobox", { name: "Module" }));
				await expect(page.getByRole("listbox")).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
				);
				break;
			case "column-visibility-menu":
				await userEvent.click(canvas.getByRole("button", { name: "Columns" }));
				await waitFor(() => expect(page.getByRole("menu")).toBeVisible());
				await userEvent.click(
					page.getByRole("menuitemcheckbox", { name: "Due date" }),
				);
				await expect(
					page.getByRole("menuitemcheckbox", { name: "Due date" }),
				).toBeChecked();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				break;
			case "context-menu":
				await userEvent.pointer({
					keys: "[MouseRight]",
					target: canvas.getByText("Right-click this region"),
				});
				await expect(page.getByRole("menu")).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				break;
			case "dialog":
				await userEvent.click(
					canvas.getByRole("button", { name: "Edit profile" }),
				);
				await expect(
					page.getByRole("dialog", { name: "Edit profile" }),
				).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						page.queryByRole("dialog", { name: "Edit profile" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "dropdown-menu":
				await userEvent.click(
					canvas.getByRole("button", { name: "Open menu" }),
				);
				await expect(page.getByRole("menu")).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				break;
			case "drawer":
				await userEvent.click(
					canvas.getByRole("button", { name: "Review posting batch" }),
				);
				await expect(
					page.getByRole("dialog", { name: "Review posting batch" }),
				).toBeVisible();
				await userEvent.click(page.getByRole("button", { name: "Cancel" }));
				await waitFor(() =>
					expect(
						page.queryByRole("dialog", { name: "Review posting batch" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "file-upload": {
				const input = requiredElement(
					canvasElement.querySelector<HTMLInputElement>('input[type="file"]') ??
						undefined,
				);
				await userEvent.upload(
					input,
					new File(["evidence"], "approval-evidence.pdf", {
						type: "application/pdf",
					}),
				);
				await expect(canvas.getByText("approval-evidence.pdf")).toBeVisible();
				break;
			}
			case "menubar": {
				await userEvent.click(canvas.getByRole("menuitem", { name: "Record" }));
				const menu = page.getByRole("menu");
				await expect(menu).toBeVisible();
				await expect(
					page.getByRole("menuitem", { name: "Delete posted record" }),
				).toHaveAttribute("data-disabled");
				await userEvent.keyboard("{Home}");
				await expect(
					page.getByRole("menuitem", { name: /Open record/ }),
				).toHaveFocus();
				await userEvent.keyboard("{ArrowDown}");
				await expect(
					page.getByRole("menuitem", { name: /Duplicate draft/ }),
				).toHaveFocus();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				break;
			}
			case "popover":
				await userEvent.click(
					canvas.getByRole("button", { name: "Open details" }),
				);
				await expect(page.getByText("Posting details")).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByText("Posting details")).not.toBeInTheDocument(),
				);
				break;
			case "select":
				await userEvent.click(canvas.getByRole("combobox", { name: "Module" }));
				await expect(
					page.getByRole("option", { name: "Inventory" }),
				).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						page.queryByRole("option", { name: "Inventory" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "saved-view-select": {
				const select = requiredElement(canvas.getAllByRole("combobox")[0]);
				await userEvent.selectOptions(select, "mine");
				await expect(select).toHaveValue("mine");
				break;
			}
			case "search-field":
				await userEvent.click(
					canvas.getByRole("button", { name: "Clear search" }),
				);
				await expect(
					canvas.getByRole("searchbox", { name: "Search suppliers" }),
				).toHaveValue("");
				break;
			case "sheet":
				await userEvent.click(canvas.getByRole("button", { name: "right" }));
				await expect(
					page.getByRole("dialog", { name: "right sheet" }),
				).toBeVisible();
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						page.queryByRole("dialog", { name: "right sheet" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "switch": {
				const control = requiredElement(canvas.getAllByRole("switch")[1]);
				await userEvent.click(control);
				await expect(control).toBeChecked();
				break;
			}
			case "tabs":
				await userEvent.click(
					requiredElement(canvas.getAllByRole("tab", { name: "Activity" })[0]),
				);
				await expect(canvas.getByText("Recent activity")).toBeVisible();
				break;
			case "toggle": {
				const toggle = requiredElement(canvas.getAllByRole("button")[0]);
				await userEvent.click(toggle);
				await expect(toggle).toHaveAttribute("aria-pressed", "false");
				break;
			}
			case "tooltip":
				await userEvent.hover(
					canvas.getByRole("button", { name: "Notifications" }),
				);
				await expect(
					requiredElement(page.getAllByRole("tooltip")[0]),
				).toBeVisible();
				break;
			case "tree-view":
				await userEvent.click(
					canvas.getByRole("button", { name: "Expand Finance" }),
				);
				await expect(
					canvas.getByRole("treeitem", { name: /Finance/ }),
				).toHaveAttribute("aria-expanded", "true");
				await userEvent.click(canvas.getByRole("button", { name: "Payables" }));
				await expect(
					requiredElement(
						canvasElement.querySelector(
							'[role="treeitem"][aria-level="2"][aria-selected="true"]',
						) ?? undefined,
					),
				).toHaveTextContent("Payables");
				break;
		}
	};
}
