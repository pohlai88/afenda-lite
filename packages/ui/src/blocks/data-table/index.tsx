// Component Imports
import DataTableBasic from "./basic";
import DataTableColumnVisibility from "./column-visibility";
import DataTableDraggableColumns from "./draggable-columns";
import DataTableExpandableRows from "./expandable-rows";
import DataTableExportButtons from "./export-button";
import DataTableFilters from "./filters";
import DataTableGraph from "./graph";
import DataTablePageSizeSelector from "./page-size-selectior";
import DataTablePinnableColumns from "./pinnable-columns";
import DataTableProgress from "./progress";
import DataTableResizableColumns from "./resizable-columns";

const DataTable = () => {
	return (
		<div className="flex flex-col gap-8">
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Basic Data Table</h2>
				<DataTableBasic />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data Table with Column Visibility
				</h2>
				<DataTableColumnVisibility />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Data table with Filters</h2>
				<DataTableFilters />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data table with Resizable Columns
				</h2>
				<DataTableResizableColumns />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data table with Pinnable Columns
				</h2>
				<DataTablePinnableColumns />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data Table with Page Size Selector
				</h2>
				<DataTablePageSizeSelector />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data table with Draggable Columns
				</h2>
				<DataTableDraggableColumns />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data table with Expandable Rows
				</h2>
				<DataTableExpandableRows />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Data table with Progress</h2>
				<DataTableProgress />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">
					Data table with Export Buttons
				</h2>
				<DataTableExportButtons />
			</div>

			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Data table with Graph</h2>
				<DataTableGraph />
			</div>
		</div>
	);
};

export default DataTable;
