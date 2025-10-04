import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Settings, Edit, Trash } from "lucide-react";

export interface DataTableColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "currency";
  searchable?: boolean;
  sortable?: boolean;
  format?: (value: any) => string;
}

export interface DataTableProps {
  title: string;
  data: any[];
  columns: DataTableColumn[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  searchPlaceholder?: string;
  enablePagination?: boolean;
  defaultRowsPerPage?: number;
  hideHeader?: boolean;
}

export function DataTable({
  title,
  data,
  columns,
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
  searchPlaceholder = "Search...",
  enablePagination = false,
  defaultRowsPerPage = 10,
  hideHeader = false,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Filter data based on search
  const filteredData = data.filter((item) =>
    columns
      .filter((col) => col.searchable && visibleColumns[col.key])
      .some((col) => {
        const value = item[col.key];
        return value?.toString().toLowerCase().includes(search.toLowerCase());
      })
  );

  // Pagination
  const totalPages = enablePagination ? Math.ceil(filteredData.length / rowsPerPage) : 1;
  const startIndex = enablePagination ? (currentPage - 1) * rowsPerPage : 0;
  const endIndex = enablePagination ? startIndex + rowsPerPage : filteredData.length;
  const paginatedData = enablePagination ? filteredData.slice(startIndex, endIndex) : filteredData;

  const visibleColumnsList = columns.filter((col) => visibleColumns[col.key]);

  const formatCellValue = (value: any, column: DataTableColumn) => {
    if (value === null || value === undefined) return "-";
    
    if (column.format) {
      return column.format(value);
    }

    switch (column.type) {
      case "date":
        return new Date(value).toLocaleDateString();
      case "currency":
        return `₹${parseFloat(value).toLocaleString()}`;
      case "boolean":
        return (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        );
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-muted-foreground">
              {enablePagination 
                ? `Showing ${paginatedData.length} of ${filteredData.length} items` 
                : `${filteredData.length} of ${data.length} items`
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add New Button for hidden header case */}
      {hideHeader && onAdd && (
        <div className="flex justify-end">
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns[column.key]}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) => ({
                    ...prev,
                    [column.key]: checked,
                  }))
                }
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumnsList.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsList.length + (onEdit || onDelete ? 1 : 0)}
                  className="text-center py-8"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsList.length + (onEdit || onDelete ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {search ? "No results found" : "No data available"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={item.id || index}>
                  {visibleColumnsList.map((column) => (
                    <TableCell key={column.key}>
                      {formatCellValue(item[column.key], column)}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedData.length} of {filteredData.length} items
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Select value={rowsPerPage.toString()} onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}