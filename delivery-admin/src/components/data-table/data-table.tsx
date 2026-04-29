import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  title?: string;
  columns: ColumnDef<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  getRowId?: (row: T, index: number) => string;
}

export function DataTable<T>({
  title,
  columns,
  data,
  total = data.length,
  page = 1,
  pageSize = data.length || 10,
  onPageChange,
  emptyTitle = "No records found",
  emptyDescription = "Try widening your filters or search criteria.",
  rowSelection,
  onRowSelectionChange,
  getRowId
}: DataTableProps<T>) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    state: {
      rowSelection
    },
    enableRowSelection: Boolean(onRowSelectionChange),
    onRowSelectionChange: (updater) => {
      if (!onRowSelectionChange) {
        return;
      }

      const nextValue = typeof updater === "function" ? updater(rowSelection ?? {}) : updater;
      onRowSelectionChange(nextValue);
    }
  });

  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-4 p-0">
        {data.length === 0 ? (
          <div className="p-5">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <>
            <div className="scrollbar-subtle overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {onRowSelectionChange ? (
                        <th className="w-12 px-4 py-3 text-left">
                          <Checkbox
                            checked={table.getIsAllRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                          />
                        </th>
                      ) : null}
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {header.isPlaceholder ? null : (
                            <div className={cn("flex items-center gap-2", header.column.getCanSort() ? "cursor-pointer select-none" : "")} onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() ? (
                                header.column.getIsSorted() === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5" />
                                )
                              ) : null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      {onRowSelectionChange ? (
                        <td className="px-4 py-3">
                          <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
                        </td>
                      ) : null}
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-top text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {onPageChange ? (
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="sm" variant="outline">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {page} / {pageCount}
                  </div>
                  <Button disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} size="sm" variant="outline">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
