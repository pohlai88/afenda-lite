"use client";

import { Columns3Icon } from "lucide-react";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";

interface ColumnVisibilityOption {
	id: string;
	label: string;
	visible: boolean;
	disabled?: boolean;
}

interface ColumnVisibilityMenuProps {
	columns: readonly ColumnVisibilityOption[];
	onVisibilityChange: (id: string, visible: boolean) => void;
	label?: string;
}

function ColumnVisibilityMenu({
	columns,
	onVisibilityChange,
	label = "Columns",
}: ColumnVisibilityMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<Columns3Icon aria-hidden="true" />
					{label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuLabel>Visible columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => (
					<DropdownMenuCheckboxItem
						key={column.id}
						checked={column.visible}
						disabled={column.disabled}
						onCheckedChange={(checked) =>
							onVisibilityChange(column.id, checked === true)
						}
						onSelect={(event) => event.preventDefault()}
					>
						{column.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export { ColumnVisibilityMenu, type ColumnVisibilityOption };
