"use client";

import {
	type ColumnDef,
	type ColumnOrderState,
	type ColumnPinningState,
	functionalUpdate,
	getCoreRowModel,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
	type ChangeEvent,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useMemo,
} from "react";
import { cn } from "../../lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { BulkActionBar } from "./bulk-action-bar";
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
	filterable?: boolean;
	key: keyof T;
	render?: (value: T[keyof T], row: T, index: number) => ReactNode;
	sortable?: boolean;
	title: string;
	width?: string;
}

export type DataTableDensity = "comfortable" | "compact";

export interface DataTableProps<T> {
	bulkActions?: ReactNode;
	className?: string;
	columnOrder?: ColumnOrderState;
	columns: DataTableColumn<T>[];
	columnVisibility?: VisibilityState;
	currentPage?: number;
	data: T[];
	density?: DataTableDensity;
	emptyAction?: ReactNode;
	emptyDescription?: string;
	emptyTitle?: string;
	error?: { title?: string; description: string; action?: ReactNode };
	filters?: Partial<Record<keyof T, string>>;
	getRowId?: (row: T, index: number) => string;
	loading?: boolean;
	onColumnOrderChange?: (order: ColumnOrderState) => void;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
	onFilterChange?: (key: keyof T, value: string) => void;
	onPageChange?: (page: number) => void;
	onPinnedColumnsChange?: (pinning: ColumnPinningState) => void;
	onSelectionChange?: (selectedRowIds: Set<string>) => void;
	onSort?: (key: keyof T, direction: "asc" | "desc") => void;
	pinnedColumns?: ColumnPinningState;
	rowActions?: (row: T, index: number) => ReactNode;
	selectable?: boolean;
	selectedRowIds?: Set<string>;
	showPagination?: boolean;
	sortBy?: keyof T;
	sortDirection?: "asc" | "desc";
	toolbar?: ReactNode;
	totalPages?: number;
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

function RowSelectionCheckbox({
	checked,
	label,
	onSelectionChange,
	rowId,
}: Readonly<{
	checked: boolean;
	label: string;
	onSelectionChange: (rowId: string, checked: boolean) => void;
	rowId: string;
}>) {
	const handleCheckedChange = useCallback(
		(nextChecked: boolean) => onSelectionChange(rowId, nextChecked === true),
		[onSelectionChange, rowId],
	);
	return (
		<Checkbox
			aria-label={label}
			checked={checked}
			onCheckedChange={handleCheckedChange}
		/>
	);
}

// This component coordinates independent table capabilities while delegating their handlers and controls.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keeping the render states together preserves their precedence and accessibility structure.
function DataTable<T extends object>({
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
	columnVisibility = {},
	onColumnVisibilityChange,
	columnOrder,
	onColumnOrderChange,
	pinnedColumns = {},
	onPinnedColumnsChange,
	bulkActions,
	error,
	className,
}: DataTableProps<T>) {
	const resolvedSelected = useMemo(
		() => selectedRowIds ?? new Set<string>(),
		[selectedRowIds],
	);
	const tableColumns = useMemo<ColumnDef<T>[]>(
		() =>
			columns.map((column) => ({
				id: String(column.key),
				accessorFn: (row) => row[column.key],
			})),
		[columns],
	);
	const resolvedColumnOrder =
		columnOrder ?? columns.map((column) => String(column.key));
	const table = useReactTable({
		data,
		columns: tableColumns,
		state: {
			columnVisibility,
			columnOrder: resolvedColumnOrder,
			columnPinning: pinnedColumns,
		},
		onColumnVisibilityChange: (updater) =>
			onColumnVisibilityChange?.(functionalUpdate(updater, columnVisibility)),
		onColumnOrderChange: (updater) =>
			onColumnOrderChange?.(functionalUpdate(updater, resolvedColumnOrder)),
		onColumnPinningChange: (updater) =>
			onPinnedColumnsChange?.(functionalUpdate(updater, pinnedColumns)),
		getCoreRowModel: getCoreRowModel(),
	});
	const columnById = useMemo(
		() => new Map(columns.map((column) => [String(column.key), column])),
		[columns],
	);
	const visibleColumns = table.getVisibleLeafColumns().flatMap((column) => {
		const definition = columnById.get(column.id);
		return definition ? [{ column, definition }] : [];
	});

	const handleSortClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const definition = columnById.get(event.currentTarget.value);
			if (!(definition && onSort)) {
				return;
			}
			const newDirection: "asc" | "desc" =
				sortBy === definition.key && sortDirection === "asc" ? "desc" : "asc";
			onSort(definition.key, newDirection);
		},
		[columnById, onSort, sortBy, sortDirection],
	);

	const getSortIcon = (columnKey: keyof T) => {
		if (sortBy !== columnKey) {
			return null;
		}
		return sortDirection === "asc" ? (
			<ChevronUpIcon className="ml-1 h-4 w-4" />
		) : (
			<ChevronDownIcon className="ml-1 h-4 w-4" />
		);
	};

	const rowIds = useMemo(
		() => data.map((row, index) => getRowId(row, index)),
		[data, getRowId],
	);

	const handleSelectAll = useCallback(
		(checked: boolean) => {
			if (!onSelectionChange) {
				return;
			}
			onSelectionChange(checked ? new Set(rowIds) : new Set());
		},
		[onSelectionChange, rowIds],
	);

	const handleSelectRow = useCallback(
		(rowId: string, checked: boolean) => {
			if (!onSelectionChange) {
				return;
			}
			const next = new Set(resolvedSelected);
			if (checked) {
				next.add(rowId);
			} else {
				next.delete(rowId);
			}
			onSelectionChange(next);
		},
		[onSelectionChange, resolvedSelected],
	);
	const handleFilterChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const definition = columnById.get(event.currentTarget.name);
			if (definition !== undefined) {
				onFilterChange?.(definition.key, event.currentTarget.value);
			}
		},
		[columnById, onFilterChange],
	);
	const handlePageClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			const page = Number(event.currentTarget.dataset.page);
			if (Number.isInteger(page) && page >= 1 && page <= totalPages) {
				onPageChange?.(page);
			}
		},
		[onPageChange, totalPages],
	);

	const isAllSelected =
		data.length > 0 && rowIds.every((id) => resolvedSelected.has(id));
	const isPartialSelected =
		resolvedSelected.size > 0 &&
		!isAllSelected &&
		rowIds.some((id) => resolvedSelected.has(id));
	let selectAllState: boolean | "indeterminate" = false;
	if (isAllSelected) {
		selectAllState = true;
	} else if (isPartialSelected) {
		selectAllState = "indeterminate";
	}

	const rowHeightClass =
		density === "compact"
			? "h-(--table-row-height-compact)"
			: "h-(--table-row-height)";

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner label="Loading data..." size="lg" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert className={className} variant="destructive">
				<AlertTitle>{error.title ?? "Unable to load data"}</AlertTitle>
				<AlertDescription>{error.description}</AlertDescription>
				{error.action ? <div className="mt-3">{error.action}</div> : null}
			</Alert>
		);
	}

	if (data.length === 0 && !toolbar && !onFilterChange) {
		return (
			<Empty
				action={emptyAction}
				description={emptyDescription}
				title={emptyTitle}
			/>
		);
	}

	const pages = pageWindow(currentPage, totalPages);

	return (
		<div className={cn("space-y-3", className)}>
			{bulkActions ? (
				<BulkActionBar
					actions={bulkActions}
					selectedCount={resolvedSelected.size}
				/>
			) : null}
			{toolbar !== undefined || onFilterChange !== undefined ? (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					{onFilterChange ? (
						<div className="flex flex-1 flex-wrap gap-2">
							{columns
								.filter((column) => column.filterable)
								.map((column) => (
									<Input
										aria-label={`Filter ${column.title}`}
										className="max-w-xs"
										key={String(column.key)}
										name={String(column.key)}
										onChange={handleFilterChange}
										placeholder={`Filter ${column.title}`}
										value={filters?.[column.key] ?? ""}
									/>
								))}
						</div>
					) : (
						<div />
					)}
					{toolbar}
				</div>
			) : null}

			{data.length === 0 ? (
				<Empty
					action={emptyAction}
					description={emptyDescription}
					title={emptyTitle}
				/>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-surface-sunken">
							<TableRow className={rowHeightClass}>
								{selectable ? (
									<TableHead className="w-12">
										<Checkbox
											aria-label="Select all rows"
											checked={selectAllState}
											onCheckedChange={handleSelectAll}
										/>
									</TableHead>
								) : null}
								{visibleColumns.map(({ column, definition }) => (
									<TableHead
										className={cn(
											column.getIsPinned() && "sticky z-20 bg-surface-sunken",
										)}
										key={column.id}
										style={{
											width: definition.width,
											left:
												column.getIsPinned() === "left"
													? column.getStart("left")
													: undefined,
											right:
												column.getIsPinned() === "right"
													? column.getAfter("right")
													: undefined,
										}}
									>
										{definition.sortable && onSort ? (
											<Button
												aria-label={`Sort by ${definition.title}`}
												className="h-auto p-0 font-medium hover:bg-transparent"
												onClick={handleSortClick}
												size="sm"
												value={String(definition.key)}
												variant="ghost"
											>
												{definition.title}
												{getSortIcon(definition.key)}
											</Button>
										) : (
											definition.title
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
										className={cn(
											rowHeightClass,
											index % 2 === 1 &&
												!resolvedSelected.has(rowId) &&
												"bg-table-stripe",
										)}
										data-state={
											resolvedSelected.has(rowId) ? "selected" : undefined
										}
										key={rowId}
									>
										{selectable ? (
											<TableCell>
												<RowSelectionCheckbox
													checked={resolvedSelected.has(rowId)}
													label={`Select row ${index + 1}`}
													onSelectionChange={handleSelectRow}
													rowId={rowId}
												/>
											</TableCell>
										) : null}
										{visibleColumns.map(({ column, definition }) => (
											<TableCell
												className={cn(
													column.getIsPinned() && "sticky z-10 bg-background",
												)}
												key={column.id}
												style={{
													left:
														column.getIsPinned() === "left"
															? column.getStart("left")
															: undefined,
													right:
														column.getIsPinned() === "right"
															? column.getAfter("right")
															: undefined,
												}}
											>
												{definition.render
													? definition.render(row[definition.key], row, index)
													: String(row[definition.key] ?? "")}
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
									aria-disabled={currentPage <= 1}
									className={
										currentPage <= 1
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
									data-page={currentPage - 1}
									onClick={handlePageClick}
								/>
							</PaginationItem>
							{pages.map((pageNumber) => (
								<PaginationItem key={pageNumber}>
									<PaginationLink
										aria-label={`Go to page ${pageNumber}`}
										className="cursor-pointer"
										data-page={pageNumber}
										isActive={currentPage === pageNumber}
										onClick={handlePageClick}
									>
										{pageNumber}
									</PaginationLink>
								</PaginationItem>
							))}
							<PaginationItem>
								<PaginationNext
									aria-disabled={currentPage >= totalPages}
									className={
										currentPage >= totalPages
											? "pointer-events-none opacity-50"
											: "cursor-pointer"
									}
									data-page={currentPage + 1}
									onClick={handlePageClick}
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
