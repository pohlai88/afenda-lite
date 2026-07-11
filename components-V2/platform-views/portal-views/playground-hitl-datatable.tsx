'use client'

/**
 * Studio / AdminCN DataTable 04 shell (datatable-user / datatable-component-04).
 * Route review adds source expectation, explicit human verdict, and bounded actions.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type {
  ColumnDef,
  PaginationState,
  SortingState
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ExternalLinkIcon
} from 'lucide-react'

import { Button } from '@/components-V2/platform-components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem
} from '@/components-V2/platform-components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components-V2/platform-components/ui/table'
import { usePagination } from '@/components-V2/platform-hooks/use-pagination'
import { cn } from '@/components-V2/lib/utils'
import {
  PlaygroundHitlConfirm,
  PlaygroundHitlMarkBadge,
  usePlaygroundHitlReviews
} from '@/features/playground/playground-hitl-confirm'
import {
  PlaygroundHitlCopyPromptButton,
  PlaygroundHitlExpectedOutcome,
  PlaygroundHitlNextAction,
  PlaygroundHitlRouteSummary
} from '@/features/playground/playground-hitl-route-review-cells'
import {
  buildPlaygroundHitlFingerprint,
  countPlaygroundHitlMarks,
  resolvePlaygroundHitlMark,
  type PlaygroundHitlMark,
  type PlaygroundHitlRow
} from '@/features/playground/playground-hitl-rows'
import { buildHitlReviewHref } from '@/features/playground/playground-hitl-views'
import type { PlaygroundPageShape } from '@/features/playground/playground-page-shape'

export type HitlItem = {
  id: string
  screen: string
  category: PlaygroundHitlRow['category']
  path: string
  shape: PlaygroundPageShape
  hitlMark: PlaygroundHitlMark
  playgroundHref: string
  source: PlaygroundHitlRow
}

const categoryLabels: Record<string, string> = {
  admin: 'Admin',
  client: 'Client',
  dynamic: 'Dynamic',
  'fft': 'Feed Farm Trade',
  auto: 'Auto'
}

function toHitlItems(
  rows: PlaygroundHitlRow[],
  reviews: ReturnType<typeof usePlaygroundHitlReviews>['reviews']
): HitlItem[] {
  return rows.map(row => {
    const fingerprint = buildPlaygroundHitlFingerprint(
      row.path,
      row.pathConfigured,
      row.shape,
      row.review
    )

    return {
      id: row.id,
      screen: row.label,
      category: row.category,
      path: row.path,
      shape: row.shape,
      hitlMark: resolvePlaygroundHitlMark(reviews[row.id], fingerprint),
      playgroundHref: row.playgroundHref,
      source: row
    }
  })
}

function buildColumns(): ColumnDef<HitlItem>[] {
  return [
    {
      id: 'route',
      header: 'Route',
      accessorKey: 'screen',
      cell: ({ row }) => (
        <PlaygroundHitlRouteSummary
          row={row.original.source}
          categoryLabel={categoryLabels[row.original.category] ?? row.original.category}
        />
      ),
      size: 230
    },
    {
      id: 'expected',
      header: 'Expected from source',
      cell: ({ row }) => <PlaygroundHitlExpectedOutcome row={row.original.source} />,
      size: 280,
      enableSorting: false
    },
    {
      id: 'verdict',
      header: 'Human verdict',
      accessorKey: 'hitlMark',
      cell: ({ row }) => (
        <PlaygroundHitlConfirm
          screenId={row.original.id}
          label={row.original.screen}
          path={row.original.path}
          pathConfigured={row.original.source.pathConfigured}
          shape={row.original.shape}
          review={row.original.source.review}
          variant='compact'
          className='min-w-48'
        />
      ),
      size: 220
    },
    {
      id: 'next-action',
      header: 'Next action',
      cell: ({ row }) => <PlaygroundHitlNextAction row={row.original.source} />,
      size: 200,
      enableSorting: false
    },
    {
      id: 'actions',
      header: () => 'Actions',
      cell: ({ row }) => {
        const inspectHref = buildHitlReviewHref({
          view: 'static',
          cat: 'all',
          shape: 'all',
          attention: 'all',
          present: 'inspect',
          screen: row.original.id
        })

        return (
          <div className='flex min-w-40 flex-col items-start gap-2'>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='secondary'
                size='sm'
                nativeButton={false}
                render={<Link href={inspectHref} scroll={false} />}
              >
                Inspect
              </Button>
              <Button
                variant='outline'
                size='sm'
                nativeButton={false}
                render={<Link href={row.original.playgroundHref} />}
              >
                <ExternalLinkIcon className='size-3.5' aria-hidden />
                Preview
              </Button>
            </div>
            <PlaygroundHitlCopyPromptButton row={row.original.source} />
          </div>
        )
      },
      size: 180,
      enableHiding: false
    }
  ]
}

/** Studio DataTable 04 shell wired to playground HITL rows. */
export function PlaygroundHitlDatatable({ rows }: { rows: PlaygroundHitlRow[] }) {
  const { reviews, hydrated } = usePlaygroundHitlReviews()
  const data = useMemo(() => toHitlItems(rows, reviews), [rows, reviews])
  const columns = useMemo(() => buildColumns(), [])
  const counts = useMemo(() => countPlaygroundHitlMarks(rows, reviews), [rows, reviews])

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  })

  useEffect(() => {
    setPagination(current =>
      current.pageIndex * current.pageSize >= data.length
        ? { ...current, pageIndex: 0 }
        : current
    )
  }, [data.length])

  // eslint-disable-next-line react-hooks/incompatible-library -- Studio DataTable 04 pattern
  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting
    },
    getRowId: row => row.id,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel()
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: Math.max(table.getPageCount(), 1),
    paginationItemsToDisplay: 2
  })

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex flex-col gap-4 p-6'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm' aria-live='polite'>
              <span className='font-medium text-foreground'>{rows.length} screens</span>
              {hydrated ? (
                <>
                  <span>·</span>
                  <PlaygroundHitlMarkBadge mark='matches' />
                  <span>{counts.matches}</span>
                  <PlaygroundHitlMarkBadge mark='needs-repair' />
                  <span>{counts['needs-repair']}</span>
                  <PlaygroundHitlMarkBadge mark='pending' />
                  <span>{counts.pending}</span>
                  {counts.obsolete > 0 ? (
                    <>
                      <PlaygroundHitlMarkBadge mark='obsolete' />
                      <span>{counts.obsolete}</span>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='h-14 border-t'>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className='text-muted-foreground first:pl-4 last:px-4'
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : header.column.getCanSort()
                            ? 'none'
                            : undefined
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type='button'
                        className='flex h-full w-full cursor-pointer items-center justify-between gap-2 select-none'
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: (
                            <ChevronUpIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                          ),
                          desc: (
                            <ChevronDownIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                          )
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-hitl-mark={row.original.hitlMark}
                  data-playground-shape={row.original.shape}
                  className={cn(
                    row.original.hitlMark === 'needs-repair' && 'bg-red-600/5',
                    row.original.hitlMark === 'obsolete' && 'bg-amber-600/5',
                    row.original.hitlMark === 'matches' && 'bg-emerald-600/5'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className='h-auto py-3 first:pl-4 last:px-4 align-top'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col'>
        <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
          Showing{' '}
          <span>
            {table.getRowCount() === 0
              ? 0
              : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
            to{' '}
            {Math.min(
              Math.max(
                table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                  table.getState().pagination.pageSize,
                0
              ),
              table.getRowCount()
            )}
          </span>{' '}
          of <span>{table.getRowCount().toString()} entries</span>
        </p>

        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label='Go to previous page'
                >
                  <ChevronLeftIcon aria-hidden='true' />
                  Previous
                </Button>
              </PaginationItem>

              {showLeftEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}

              {pages.map(page => {
                const isActive = page === table.getState().pagination.pageIndex + 1

                return (
                  <PaginationItem key={page}>
                    <Button
                      size='icon'
                      className={`${!isActive && 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40'}`}
                      onClick={() => table.setPageIndex(page - 1)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                )
              })}

              {showRightEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}

              <PaginationItem>
                <Button
                  className='disabled:pointer-events-none disabled:opacity-50'
                  variant='ghost'
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label='Go to next page'
                >
                  Next
                  <ChevronRightIcon aria-hidden='true' />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}
