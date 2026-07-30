import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ChangeEvent, useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ColumnVisibilityMenu } from "../src/components/ui/column-visibility-menu";
import { DataTable } from "../src/components/ui/data-table";
import { FileUpload } from "../src/components/ui/file-upload";
import { SearchField } from "../src/components/ui/search-field";
import { TreeView } from "../src/components/ui/tree-view";

describe("ERP baseline interactions", () => {
	it("clears a controlled search field", async () => {
		const user = userEvent.setup();
		function Example() {
			const [value, setValue] = useState("invoice");
			const handleChange = useCallback(
				(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
				[],
			);
			const handleClear = useCallback(() => setValue(""), []);
			return (
				<SearchField
					aria-label="Search records"
					onChange={handleChange}
					onClear={handleClear}
					value={value}
				/>
			);
		}
		render(<Example />);
		await user.click(screen.getByRole("button", { name: "Clear search" }));
		expect(
			screen.getByRole("searchbox", { name: "Search records" }),
		).toHaveValue("");
	});

	it("reports controlled column visibility changes", async () => {
		const user = userEvent.setup();
		const onVisibilityChange = vi.fn();
		render(
			<ColumnVisibilityMenu
				columns={[{ id: "amount", label: "Amount", visible: true }]}
				onVisibilityChange={onVisibilityChange}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Columns" }));
		await user.click(screen.getByRole("menuitemcheckbox", { name: "Amount" }));
		expect(onVisibilityChange).toHaveBeenCalledWith("amount", false);
	});

	it("supports hierarchy expansion and selection", () => {
		const onSelect = vi.fn();
		render(
			<TreeView
				nodes={[
					{
						id: "assets",
						label: "Assets",
						children: [{ id: "cash", label: "Cash" }],
					},
				]}
				onSelect={onSelect}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Expand Assets" }));
		fireEvent.click(screen.getByRole("button", { name: "Cash" }));
		expect(onSelect).toHaveBeenCalledWith(
			expect.objectContaining({ id: "cash" }),
		);
	});

	it("passes selected files to the consumer", () => {
		const onFilesSelected = vi.fn();
		render(<FileUpload onFilesSelected={onFilesSelected} />);
		const file = new File(["content"], "invoice.pdf", {
			type: "application/pdf",
		});
		fireEvent.change(screen.getByLabelText("Attachments"), {
			target: { files: [file] },
		});
		expect(onFilesSelected).toHaveBeenCalledWith([file]);
	});

	it("applies controlled table visibility and bulk actions", () => {
		render(
			<DataTable
				bulkActions={<button type="button">Post selected</button>}
				columns={[
					{ key: "name", title: "Name" },
					{ key: "amount", title: "Amount" },
				]}
				columnVisibility={{ amount: false }}
				data={[{ name: "Invoice", amount: 42 }]}
				selectable
				selectedRowIds={new Set(["0"])}
			/>,
		);
		expect(
			screen.queryByRole("columnheader", { name: "Amount" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("region", { name: "Bulk actions" }),
		).toHaveTextContent("1 selected");
	});
});
