'use client'

/**
 * Studio / AdminCN DataTable 05 shell (datatable-invoice / datatable-component-05).
 * Landed block: components-V2/platform-views/datatables/datatable-invoice.tsx
 * Columns + actions adapted for operator declarations only.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { useId, useMemo, useState, useTransition } from 'react'

import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowData
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EyeIcon,
  FileTextIcon,
  Loader2Icon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon
} from 'lucide-react'

import { createDraftSurveyAction, deleteSurveyAction } from '@/app/actions/surveys'
import { Badge } from '@/components-V2/platform-components/ui/badge'
import { Button } from '@/components-V2/platform-components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components-V2/platform-components/ui/input-group'
import { Label } from '@/components-V2/platform-components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem
} from '@/components-V2/platform-components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components-V2/platform-components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components-V2/platform-components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components-V2/platform-components/ui/tooltip'
import { usePagination } from '@/components-V2/platform-hooks/use-pagination'
import { cn } from '@/components-V2/lib/utils'
import { ConfirmDialog } from '@/features/organization-admin/confirm-dialog'
import type { OrgDeclarationRow } from '@/features/organization-admin/organization-admin-dashboard-types'
import { portalCopy } from '@/modules/platform/copy/portal-copy'
import { displaySurveyTitle } from '@/modules/declarations/domain/survey-display'
import { isDraftSurveyTitle } from '@/modules/declarations/domain/survey-draft'
import { organizationAdminDeclarationHref } from '@/modules/platform/routing/portal-routes'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select'
  }
}

export type DeclarationItem = {
  id: string
  title: string
  description: string
  caseNumber: string
  submissions: number
  status: 'draft' | 'published'
}

function toItems(rows: OrgDeclarationRow[]): DeclarationItem[] {
  return rows.map(row => {
    const title = displaySurveyTitle(row.title, row.id)
    const draft = isDraftSurveyTitle(row.title)

    return {
      id: row.id,
      title,
      description: row.description || (draft ? portalCopy.org.list.tableDraftHint : ''),
      caseNumber: row.caseNumber ?? portalCopy.org.list.tableCaseEmpty,
      submissions: row.responseCount,
      status: draft ? 'draft' : 'published'
    }
  })
}

function CreateDeclarationButton() {
  const { create } = portalCopy.org
  const { pending } = useFormStatus()

  return (
    <Button type='submit' disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2Icon className='animate-spin' aria-hidden />
          {create.submitting}
        </>
      ) : (
        <>
          <SettingsIcon aria-hidden />
          {create.openSettings}
        </>
      )}
    </Button>
  )
}

function DeclarationDeleteButton({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={isPending}
              aria-busy={isPending}
              aria-label={manage.deleteSubmit}
              onClick={() => setOpen(true)}
            />
          }
        >
          <Trash2Icon className='size-4.5' />
        </TooltipTrigger>
        <TooltipContent>
          <p>{manage.deleteSubmit}</p>
        </TooltipContent>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title={manage.deleteTitle}
        description={manage.deleteConfirm}
        confirmLabel={manage.deleteSubmit}
        cancelLabel={manage.deleteCancel}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          const formData = new FormData()
          formData.set('id', surveyId)
          startTransition(async () => {
            const result = await deleteSurveyAction(formData)
            if (result && 'success' in result && result.success) {
              router.refresh()
            }
          })
        }}
      />
    </>
  )
}

function buildColumns(): ColumnDef<DeclarationItem>[] {
  const { list: copy } = portalCopy.org

  return [
    {
      header: copy.tableTitle,
      accessorKey: 'title',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-sm'>
            <FileTextIcon className='size-4' aria-hidden />
          </div>
          <div className='flex min-w-0 flex-col'>
            <Link
              href={organizationAdminDeclarationHref(row.original.id)}
              className='hover:underline focus-visible:ring-ring truncate font-medium outline-none focus-visible:ring-2'
            >
              {row.getValue('title')}
            </Link>
            {row.original.description ? (
              <span className='text-muted-foreground truncate'>{row.original.description}</span>
            ) : null}
          </div>
        </div>
      ),
      size: 320
    },
    {
      header: copy.tableCase,
      accessorKey: 'caseNumber',
      cell: ({ row }) => (
        <span className='text-muted-foreground tabular-nums'>{row.getValue('caseNumber')}</span>
      ),
      size: 120
    },
    {
      header: 'Status',
      accessorKey: 'status',
      filterFn: 'equalsString',
      cell: ({ row }) => {
        const status = row.getValue('status') as DeclarationItem['status']

        return (
          <Badge
            className={cn(
              'h-auto rounded-sm border-none capitalize',
              status === 'draft'
                ? 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
                : 'bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400'
            )}
          >
            {status}
          </Badge>
        )
      },
      meta: {
        filterVariant: 'select'
      },
      size: 120
    },
    {
      header: copy.tableSubmissions,
      accessorKey: 'submissions',
      cell: ({ row }) => (
        <Badge variant='secondary' className='tabular-nums'>
          {copy.submissions(row.getValue('submissions') as number)}
        </Badge>
      ),
      size: 140
    },
    {
      id: 'actions',
      header: () => copy.tableActions,
      cell: ({ row }) => (
        <div className='flex items-center justify-center gap-1'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={copy.viewSubmissions}
                  nativeButton={false}
                  render={<Link href={organizationAdminDeclarationHref(row.original.id)} />}
                />
              }
            >
              <EyeIcon className='size-4.5' />
            </TooltipTrigger>
            <TooltipContent>
              <p>{copy.viewSubmissions}</p>
            </TooltipContent>
          </Tooltip>
          <DeclarationDeleteButton surveyId={row.original.id} />
        </div>
      ),
      size: 128,
      enableHiding: false
    }
  ]
}

/** Studio DataTable 05 shell wired to operator declaration rows. */
export function PortalDeclarationsDatatable({ rows }: { rows: OrgDeclarationRow[] }) {
  const data = useMemo(() => toItems(rows), [rows])
  const columns = useMemo(() => buildColumns(), [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      pagination
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination
  })

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: 2
  })

  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex gap-6 p-6 max-lg:flex-col lg:items-center lg:justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Label htmlFor='declaration-row-select' className='text-muted-foreground text-base font-normal max-sm:sr-only'>
                Show
              </Label>
              <Select
                items={[5, 10, 25, 50].map(size => ({
                  label: String(size),
                  value: String(size)
                }))}
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value: string | null) => {
                  if (value) table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger id='declaration-row-select' className='w-fit whitespace-nowrap'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[5, 10, 25, 50].map(pageSize => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <form action={createDraftSurveyAction}>
              <CreateDeclarationButton />
            </form>
          </div>
          <div className='flex flex-1 flex-wrap items-center gap-4 lg:justify-end'>
            <Filter column={table.getColumn('title')!} />
            <Filter column={table.getColumn('status')!} />
          </div>
        </div>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className='h-14 border-t'>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className='text-muted-foreground first:pl-4 last:px-4 last:text-center'
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(
                          header.column.getCanSort() &&
                            'flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={e => {
                          if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            header.column.getToggleSortingHandler()?.(e)
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />,
                          desc: <ChevronDownIcon className='shrink-0 opacity-60' size={16} aria-hidden='true' />
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className='h-14 first:pl-4'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  {portalCopy.org.list.emptyTitle}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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

function Filter({ column }: { column: Column<DeclarationItem, unknown> }) {
  const id = useId()
  const columnFilterValue = column.getFilterValue()
  const { filterVariant } = column.columnDef.meta ?? {}
  const columnHeader = typeof column.columnDef.header === 'string' ? column.columnDef.header : ''
  const facetedUniqueValues = column.getFacetedUniqueValues()

  const sortedUniqueValues = useMemo(() => {
    if (filterVariant === 'range') return []

    const values = Array.from(facetedUniqueValues.keys())
    const flattenedValues = values.reduce((acc: string[], curr) => {
      if (Array.isArray(curr)) {
        return [...acc, ...curr]
      }

      return [...acc, curr]
    }, [])

    return Array.from(new Set(flattenedValues)).sort()
  }, [facetedUniqueValues, filterVariant])

  if (filterVariant === 'select') {
    return (
      <div className='w-full max-w-2xs'>
        <Label htmlFor={`${id}-select`} className='sr-only'>
          {columnHeader}
        </Label>
        <Select
          items={[
            { label: 'All', value: 'all' },
            ...sortedUniqueValues.map(value => ({
              label: String(value),
              value: String(value)
            }))
          ]}
          value={columnFilterValue?.toString() ?? 'all'}
          onValueChange={(value: string | null) => {
            column.setFilterValue(value === 'all' || value === null ? undefined : value)
          }}
        >
          <SelectTrigger id={`${id}-select`} className='w-full capitalize'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value='all'>All</SelectItem>
              {sortedUniqueValues.map(value => (
                <SelectItem key={String(value)} value={String(value)} className='capitalize'>
                  {String(value)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className='w-full max-w-2xs'>
      <Label htmlFor={`${id}-input`} className='sr-only'>
        {columnHeader}
      </Label>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={`${id}-input`}
          value={(columnFilterValue ?? '') as string}
          onChange={e => column.setFilterValue(e.target.value)}
          placeholder={`Search ${columnHeader.toLowerCase()}`}
          type='text'
        />
      </InputGroup>
    </div>
  )
}
