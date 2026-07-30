"use client";

import { Columns3Icon } from "lucide-react";
import { useCallback } from "react";
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
	disabled?: boolean;
	id: string;
	label: string;
	visible: boolean;
}

interface ColumnVisibilityMenuProps {
	columns: readonly ColumnVisibilityOption[];
	label?: string;
	onVisibilityChange: (id: string, visible: boolean) => void;
}

function ColumnVisibilityItem({
	column,
	onVisibilityChange,
}: Readonly<{
	column: ColumnVisibilityOption;
	onVisibilityChange: ColumnVisibilityMenuProps["onVisibilityChange"];
}>) {
	const handleCheckedChange = useCallback(
		(checked: boolean) => onVisibilityChange(column.id, checked === true),
		[column.id, onVisibilityChange],
	);
	const preventClose = useCallback(
		(event: Event) => event.preventDefault(),
		[],
	);
	return (
		<DropdownMenuCheckboxItem
			checked={column.visible}
			{...(column.disabled === undefined ? {} : { disabled: column.disabled })}
			onCheckedChange={handleCheckedChange}
			onSelect={preventClose}
		>
			{column.label}
		</DropdownMenuCheckboxItem>
	);
}

function ColumnVisibilityMenu({
	columns,
	onVisibilityChange,
	label = "Columns",
}: ColumnVisibilityMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline">
					<Columns3Icon aria-hidden="true" />
					{label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuLabel>Visible columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => (
					<ColumnVisibilityItem
						column={column}
						key={column.id}
						onVisibilityChange={onVisibilityChange}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export { ColumnVisibilityMenu, type ColumnVisibilityOption };
