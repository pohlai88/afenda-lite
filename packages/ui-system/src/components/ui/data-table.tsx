"use client";

import * as React from "react";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Empty } from "./empty";
import { Spinner } from "./spinner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

export interface DataTableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
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
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
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
  className,
}: DataTableProps<T>) {
  const handleSort = (columnKey: keyof T) => {
    if (!onSort) return;
    
    let newDirection: "asc" | "desc" = "asc";
    
    if (sortBy === columnKey && sortDirection === "asc") {
      newDirection = "desc";
    }
    
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label="Loading data..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Empty
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const renderPagination = () => {
    if (!showPagination || !onPageChange || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center py-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage <= 1}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              return (
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
              );
            })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                aria-disabled={currentPage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={String(column.key)}>
                  {column.render 
                    ? column.render(row[column.key], row, index)
                    : String(row[column.key] ?? "")
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}
    </div>
  );
}

export { DataTable };