"use client";

import type { ReactNode } from "react";
import type { Table as ReactTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { DataTablePager } from "@/components/datatable-pager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilteredDataTableProps<T> = {
  table: ReactTable<T>;
  pageSize: number;
  toolbar?: ReactNode;
  emptyMessage?: string;
};

/** Card-wrapped TanStack table with optional toolbar, empty state, and pager. */
export function FilteredDataTable<T>({
  table,
  pageSize,
  toolbar,
  emptyMessage,
}: FilteredDataTableProps<T>) {
  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <Card className="overflow-hidden py-0">
      {toolbar}
      <div className="border-b">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground h-12 first:pl-4 last:pr-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage ?? "No results."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {filteredCount > pageSize ? (
        <DataTablePager
          table={table}
          pageSize={pageSize}
          total={filteredCount}
        />
      ) : null}
    </Card>
  );
}
