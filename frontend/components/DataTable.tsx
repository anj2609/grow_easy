"use client";

import { useRef } from "react";
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
    overscan: 12,
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 dark:border-white/15 p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  const totalWidth = columns.reduce((sum, col) => sum + (col.width ?? DEFAULT_COLUMN_WIDTH), 0);
  const gridTemplateColumns = columns
    .map((col) => `${col.width ?? DEFAULT_COLUMN_WIDTH}px`)
    .join(" ");
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`relative overflow-auto rounded-lg border border-black/10 dark:border-white/15 ${maxHeightClass}`}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div
          className="sticky top-0 z-10 grid bg-neutral-100 dark:bg-neutral-800 border-b border-black/10 dark:border-white/15"
          style={{ gridTemplateColumns }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 truncate"
              title={col.header}
            >
              {col.header}
            </div>
          ))}
        </div>

        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 grid w-full items-center border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                style={{
                  gridTemplateColumns,
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
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
          })}
        </div>
      </div>
    </div>
  );
}
