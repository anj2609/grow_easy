"use client";

import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: number;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends object> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  maxHeightClass?: string;
}

const DEFAULT_COLUMN_WIDTH = 180;
const ROW_HEIGHT = 40;
const OVERSCAN = 12;

interface DataTableRowProps<T extends object> {
  columns: DataTableColumn<T>[];
  gridTemplateColumns: string;
  row: T;
  height: number;
  offsetY: number;
}

/**
 * Memoized so React skips re-rendering already-mounted rows when unrelated table state
 * changes; combined with row virtualization this keeps the DOM node count — and re-render
 * cost — constant regardless of how many rows the CSV contains.
 */
function DataTableRowInner<T extends object>({
  columns,
  gridTemplateColumns,
  row,
  height,
  offsetY,
}: DataTableRowProps<T>) {
  return (
    <div
      className="absolute left-0 top-0 grid w-full items-center border-b border-border hover:bg-surface-hover"
      style={{ gridTemplateColumns, height, transform: `translateY(${offsetY}px)` }}
    >
      {columns.map((col) => {
        const value = (row as Record<string, unknown>)[col.key];
        return (
          <div
            key={col.key}
            className="px-3 py-2 text-sm truncate"
            title={typeof value === "string" ? value : undefined}
          >
            {col.render ? col.render(row) : String(value ?? "")}
          </div>
        );
      })}
    </div>
  );
}

const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner;

/** Generic, reusable table: sticky header, horizontal + vertical scroll, row virtualization for large CSVs. */
export function DataTable<T extends object>({
  columns,
  rows,
  emptyMessage = "No data to display",
  maxHeightClass = "max-h-[28rem]",
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const { totalWidth, gridTemplateColumns } = useMemo(
    () => ({
      totalWidth: columns.reduce((sum, col) => sum + (col.width ?? DEFAULT_COLUMN_WIDTH), 0),
      gridTemplateColumns: columns.map((col) => `${col.width ?? DEFAULT_COLUMN_WIDTH}px`).join(" "),
    }),
    [columns]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-fg-muted">
        {emptyMessage}
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`relative overflow-auto rounded-lg border border-border bg-surface ${maxHeightClass}`}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div
          className="sticky top-0 z-10 grid bg-surface-hover border-b border-border"
          style={{ gridTemplateColumns }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted truncate"
              title={col.header}
            >
              {col.header}
            </div>
          ))}
        </div>

        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {virtualRows.map((virtualRow) => (
            <DataTableRow
              key={virtualRow.key}
              columns={columns}
              gridTemplateColumns={gridTemplateColumns}
              row={rows[virtualRow.index]}
              height={virtualRow.size}
              offsetY={virtualRow.start}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
