"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Empty } from "./empty";
import { Input } from "./input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./pagination";
import { Spinner } from "./spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

export interface DataTableColumn<T> {
	key: keyof T;
	title: string;
	sortable?: boolean;
	filterable?: boolean;
	width?: string;
	render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
}

export type DataTableDensity = "comfortable" | "compact";

export interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	getRowId?: (row: T, index: number) => string;
	loading?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyAction?: React.ReactNode;
	sortBy?: keyof T;
	sortDirection?: "asc" | "desc";
	onSort?: (key: keyof T, direction: "asc" | "desc") => void;
	currentPage?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	showPagination?: boolean;
	selectable?: boolean;
	selectedRowIds?: Set<string>;
	onSelectionChange?: (selectedRowIds: Set<string>) => void;
	rowActions?: (row: T, index: number) => React.ReactNode;
	toolbar?: React.ReactNode;
	filters?: Partial<Record<keyof T, string>>;
	onFilterChange?: (key: keyof T, value: string) => void;
	density?: DataTableDensity;
	className?: string;
}

function pageWindow(
	currentPage: number,
	totalPages: number,
	size = 5,
): number[] {
	if (totalPages <= size) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const half = Math.floor(size / 2);
	let start = Math.max(1, currentPage - half);
	const end = Math.min(totalPages, start + size - 1);
	start = Math.max(1, end - size + 1);
	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function DataTable<T extends Record<string, unknown>>({
	columns,
	data,
	getRowId = (_row, index) => String(index),
	loading = false,
	emptyTitle = "No data available",
	emptyDescription = "There are no items to display at this time",
	emptyAction,
	sortBy,
	sortDirection,
	onSort,
	currentPage = 1,
	totalPages = 1,
	onPageChange,
	showPagination = false,
	selectable = false,
	selectedRowIds,
	onSelectionChange,
	rowActions,
	toolbar,
	filters,
	onFilterChange,
	density = "comfortable",
	className,
}: DataTableProps<T>) {
	const resolvedSelected = selectedRowIds ?? new Set<string>();

	const handleSort = (columnKey: keyof T) => {
		if (!onSort) return;
		const newDirection: "asc" | "desc" =
			sortBy === columnKey && sortDirection === "asc" ? "desc" : "asc";
		onSort(columnKey, newDirection);
	};

	const getSortIcon = (columnKey: keyof T) => {
		if (sortBy !== columnKey) return null;
		return sortDirection === "asc" ? (
			<ChevronUpIcon className="ml-1 h-4 w-4" />
		) : (
			<ChevronDownIcon className="ml-1 h-4 w-4" />
		);
	};

	const rowIds = data.map((row, index) => getRowId(row, index));

	const handleSelectAll = (checked: boolean) => {
		if (!onSelectionChange) return;
		onSelectionChange(checked ? new Set(rowIds) : new Set());
	};

	const handleSelectRow = (rowId: string, checked: boolean) => {
		if (!onSelectionChange) return;
		const next = new Set(resolvedSelected);
		if (checked) next.add(rowId);
		else next.delete(rowId);
		onSelectionChange(next);
	};

	const isAllSelected =
		data.length > 0 && rowIds.every((id) => resolvedSelected.has(id));
	const isPartialSelected =
		resolvedSelected.size > 0 &&
		!isAllSelected &&
		rowIds.some((id) => resolvedSelected.has(id));

	const rowHeightClass =
		density === "compact"
			? "h-[var(--table-row-height-compact)]"
			: "h-[var(--table-row-height)]";

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner size="lg" label="Loading data..." />
			</div>
		);
	}

	if (data.length === 0 && !toolbar && !onFilterChange) {
		return (
			<Empty
				title={emptyTitle}
				description={emptyDescription}
				action={emptyAction}
			/>
		);
	}

	const pages = pageWindow(currentPage, totalPages);

	return (
		<div className={cn("space-y-3", className)}>
			{(toolbar || onFilterChange) && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					{onFilterChange ? (
						<div className="flex flex-1 flex-wrap gap-2">
							{columns
								.filter((column) => column.filterable)
								.map((column) => (
									<Input
										key={String(column.key)}
										value={filters?.[column.key] ?? ""}
										onChange={(event) =>
											onFilterChange(column.key, event.target.value)
										}
										placeholder={`Filter ${column.title}`}
										aria-label={`Filter ${column.title}`}
										className="max-w-xs"
									/>
								))}
						</div>
					) : (
						<div />
					)}
					{toolbar}
				</div>
			)}

			{data.length === 0 ? (
				<Empty
					title={emptyTitle}
					description={emptyDescription}
					action={emptyAction}
				/>
			) : (
				<div className="overflow-x-auto rounded-md border shadow-[var(--shadow-raised)]">
					<Table>
						<TableHeader className="bg-surface-sunken sticky top-0 z-10">
							<TableRow className={rowHeightClass}>
								{selectable && (
									<TableHead className="w-12">
										<Checkbox
											checked={
												isAllSelected
													? true
													: isPartialSelected
														? "indeterminate"
														: false
											}
											onCheckedChange={handleSelectAll}
											aria-label="Select all rows"
										/>
									</TableHead>
								)}
								{columns.map((column) => (
									<TableHead
										key={String(column.key)}
										style={{ width: column.width }}
									>
										{column.sortable && onSort ? (
											<Button
												variant="ghost"
												size="sm"
												className="h-auto p-0 font-medium hover:bg-transparent"
												onClick={() => handleSort(column.key)}
												aria-label={`Sort by ${column.title}`}
											>
												{column.title}
												{getSortIcon(column.key)}
											</Button>
										) : (
											column.title
										)}
									</TableHead>
								))}
								{rowActions ? (
									<TableHead className="w-[1%] text-right">Actions</TableHead>
								) : null}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((row, index) => {
								const rowId = getRowId(row, index);
								return (
									<TableRow
										key={rowId}
										data-state={
											resolvedSelected.has(rowId) ? "selected" : undefined
										}
										className={cn(
											rowHeightClass,
											index % 2 === 1 &&
												!resolvedSelected.has(rowId) &&
												"bg-table-stripe",
										)}
									>
										{selectable && (
											<TableCell>
												<Checkbox
													checked={resolvedSelected.has(rowId)}
													onCheckedChange={(checked) =>
														handleSelectRow(rowId, checked === true)
													}
													aria-label={`Select row ${index + 1}`}
												/>
											</TableCell>
										)}
										{columns.map((column) => (
											<TableCell key={String(column.key)}>
												{column.render
													? column.render(row[column.key], row, index)
													: String(row[column.key] ?? "")}
											</TableCell>
										))}
										{rowActions ? (
											<TableCell className="text-right">
												{rowActions(row, index)}
											</TableCell>
										) : null}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}

			{showPagination && onPageChange && totalPages > 1 ? (
				<div className="flex items-center justify-center py-2">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={() =>
										currentPage > 1 && onPageChange(currentPage - 1)
									}
									className={
										currentPage <= 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
									aria-disabled={currentPage <= 1}
								/>
							</PaginationItem>
							{pages.map((pageNumber) => (
								<PaginationItem key={pageNumber}>
									<PaginationLink
										onClick={() => onPageChange(pageNumber)}
										isActive={currentPage === pageNumber}
										className="cursor-pointer"
										aria-label={`Go to page ${pageNumber}`}
									>
										{pageNumber}
									</PaginationLink>
								</PaginationItem>
							))}
							<PaginationItem>
								<PaginationNext
									onClick={() =>
										currentPage < totalPages && onPageChange(currentPage + 1)
									}
									className={
										currentPage >= totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
									aria-disabled={currentPage >= totalPages}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			) : null}
		</div>
	);
}

export { DataTable, pageWindow };
