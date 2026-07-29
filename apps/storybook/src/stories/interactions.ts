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
	| "input"
	| "input-group"
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
					canvas.getByRole("button", { name: "Closed until requested" }),
				);
				await expect(
					canvas.getByText(/Secondary explanatory detail remains collapsed/),
				).toBeVisible();
				break;
			case "alert-dialog":
				await userEvent.click(
					canvas.getByRole("button", { name: "Open delete confirmation" }),
				);
				await expect(page.getByRole("alertdialog")).toHaveAttribute(
					"data-state",
					"open",
				);
				await userEvent.click(
					page.getByRole("button", { name: "Keep invoice" }),
				);
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
			case "collapsible": {
				const trigger = canvas.getByRole("button", { name: "Toggle details" });
				const content = canvas.getByText(
					/Additional audit evidence appears here/,
				);

				await expect(trigger).toHaveAttribute("aria-expanded", "true");
				await expect(content).toBeVisible();

				await userEvent.click(trigger);
				await expect(trigger).toHaveAttribute("aria-expanded", "false");

				await userEvent.click(trigger);
				await expect(trigger).toHaveAttribute("aria-expanded", "true");
				await expect(content).toBeVisible();
				break;
			}
			case "combobox":
				await userEvent.click(canvas.getByRole("combobox", { name: "Module" }));
				await waitFor(() => expect(page.getByRole("listbox")).toBeVisible());
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
			case "context-menu": {
				const target = canvas.getByText("Right-click this region");
				target.focus();
				await expect(target).toHaveFocus();
				await userEvent.pointer({
					keys: "[MouseRight]",
					target,
				});
				await waitFor(() => expect(page.getByRole("menu")).toBeVisible());
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				await expect(target).toHaveFocus();
				break;
			}
			case "dialog":
				await userEvent.click(
					canvas.getByRole("button", { name: "Edit supplier contact" }),
				);
				await waitFor(() =>
					expect(
						page.getByRole("dialog", { name: "Edit finance contact" }),
					).toBeVisible(),
				);
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						page.queryByRole("dialog", { name: "Edit finance contact" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "dropdown-menu":
				await userEvent.click(
					canvas.getByRole("button", { name: "Open menu" }),
				);
				await waitFor(() => expect(page.getByRole("menu")).toBeVisible());
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByRole("menu")).not.toBeInTheDocument(),
				);
				break;
			case "drawer":
				await userEvent.click(
					canvas.getByRole("button", { name: "Review posting batch" }),
				);
				await waitFor(() =>
					expect(
						page.getByRole("dialog", { name: "Review posting batch" }),
					).toBeVisible(),
				);
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
			case "input": {
				const editable = canvas.getByLabelText("Editable reference");
				await userEvent.click(editable);
				await expect(editable).toHaveFocus();
				await expect(
					canvas.getByLabelText("Approved reference"),
				).toHaveAttribute("readonly");
				await expect(
					canvas.getByLabelText("Unavailable integration reference"),
				).toBeDisabled();
				await expect(canvas.getByLabelText("Tax identifier")).toHaveAttribute(
					"aria-invalid",
					"true",
				);
				break;
			}
			case "input-group": {
				const editable = canvas.getByLabelText("Editable amount");
				await userEvent.click(editable);
				await expect(editable).toHaveFocus();
				await expect(
					canvas.getByLabelText("Invalid tax identifier"),
				).toHaveAttribute("aria-invalid", "true");
				await expect(
					canvas.getByLabelText("Locked remittance reference"),
				).toBeDisabled();
				await expect(
					canvas.getByRole("button", {
						name: "Copy locked remittance reference",
					}),
				).toBeDisabled();
				break;
			}
			case "menubar": {
				await userEvent.click(canvas.getByRole("menuitem", { name: "Record" }));
				const menu = page.getByRole("menu");
				await waitFor(() => expect(menu).toBeVisible());
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
				await waitFor(() =>
					expect(page.getByText("Posting details")).toBeVisible(),
				);
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(page.queryByText("Posting details")).not.toBeInTheDocument(),
				);
				break;
			case "select":
				await userEvent.click(canvas.getByRole("combobox", { name: "Module" }));
				await waitFor(() =>
					expect(page.getByRole("option", { name: "Inventory" })).toBeVisible(),
				);
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
				await userEvent.click(
					canvas.getByRole("button", { name: "Inspect invoice" }),
				);
				await waitFor(() =>
					expect(
						page.getByRole("dialog", { name: "Invoice INV-1048" }),
					).toBeVisible(),
				);
				await userEvent.keyboard("{Escape}");
				await waitFor(() =>
					expect(
						page.queryByRole("dialog", { name: "Invoice INV-1048" }),
					).not.toBeInTheDocument(),
				);
				break;
			case "switch": {
				const control = requiredElement(canvas.getAllByRole("switch")[0]);
				await userEvent.click(control);
				await expect(control).not.toBeChecked();
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
				await waitFor(() =>
					expect(
						requiredElement(page.getAllByRole("tooltip")[0]),
					).toBeVisible(),
				);
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
