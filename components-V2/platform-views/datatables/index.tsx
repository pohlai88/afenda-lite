// Component Imports
import DataTableBasic from '@/components-V2/platform-views/datatables/basic'
import DataTableProgress from '@/components-V2/platform-views/datatables/progress'
import DataTableFilters from '@/components-V2/platform-views/datatables/filters'
import DataTablePageSizeSelector from '@/components-V2/platform-views/datatables/page-size-selectior'
import DataTableExportButtons from '@/components-V2/platform-views/datatables/export-button'
import DataTableGraph from '@/components-V2/platform-views/datatables/graph'
import DataTableColumnVisibility from '@/components-V2/platform-views/datatables/column-visibility'
import DataTableDraggableColumns from '@/components-V2/platform-views/datatables/draggable-columns'
import DataTableExpandableRows from '@/components-V2/platform-views/datatables/expandable-rows'
import DataTablePinnableColumns from '@/components-V2/platform-views/datatables/pinnable-columns'
import DataTableResizableColumns from '@/components-V2/platform-views/datatables/resizable-columns'

const DataTable = () => {
  return (
    <div className='flex flex-col gap-8'>
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Basic Data Table</h2>
        <DataTableBasic />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data Table with Column Visibility</h2>
        <DataTableColumnVisibility />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Filters</h2>
        <DataTableFilters />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Resizable Columns</h2>
        <DataTableResizableColumns />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Pinnable Columns</h2>
        <DataTablePinnableColumns />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data Table with Page Size Selector</h2>
        <DataTablePageSizeSelector />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Draggable Columns</h2>
        <DataTableDraggableColumns />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Expandable Rows</h2>
        <DataTableExpandableRows />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Progress</h2>
        <DataTableProgress />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Export Buttons</h2>
        <DataTableExportButtons />
      </div>

      <div className='space-y-4'>
        <h2 className='text-xl font-semibold'>Data table with Graph</h2>
        <DataTableGraph />
      </div>
    </div>
  )
}

export default DataTable
