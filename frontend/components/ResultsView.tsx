"use client";

import { useMemo, useState } from "react";
import { CRM_FIELDS, CrmRecord, SkippedRecord } from "@groweasy/shared";
import { DataTable, DataTableColumn } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import { SummaryCard } from "./SummaryCard";
import { SKIP_REASON_LABELS, toneForCrmStatus, toneForSkipReason } from "@/lib/theme";

interface ResultsViewProps {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
  onStartOver: () => void;
}

type SkippedRow = Record<string, unknown> & { reason: SkippedRecord["reason"] };

const IMPORTED_COLUMNS: DataTableColumn<CrmRecord>[] = CRM_FIELDS.map((field) => ({
  key: field,
  header: field,
  width: field === "crm_note" || field === "description" ? 260 : 160,
  render:
    field === "crm_status"
      ? (row) => (row.crm_status ? <StatusBadge label={row.crm_status} tone={toneForCrmStatus(row.crm_status)} /> : null)
      : undefined,
}));

export function ResultsView({ records, skipped, totalRows, onStartOver }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<"imported" | "skipped">("imported");

  const skippedRows = useMemo<SkippedRow[]>(
    () => skipped.map((s) => ({ reason: s.reason, ...s.originalRow })),
    [skipped]
  );

  const skippedColumns = useMemo<DataTableColumn<SkippedRow>[]>(() => {
    const headerKeys = new Set<string>();
    skipped.forEach((s) => Object.keys(s.originalRow).forEach((k) => headerKeys.add(k)));
    return [
      {
        key: "reason",
        header: "Skip Reason",
        width: 220,
        render: (row) => (
          <StatusBadge label={SKIP_REASON_LABELS[row.reason]} tone={toneForSkipReason(row.reason)} />
        ),
      },
      ...Array.from(headerKeys).map((key) => ({ key, header: key, width: 180 })),
    ];
  }, [skipped]);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Rows" value={totalRows} />
        <SummaryCard label="Imported" value={records.length} tone="success" />
        <SummaryCard label="Skipped" value={skipped.length} tone="warning" />
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border p-1">
          <TabButton active={activeTab === "imported"} onClick={() => setActiveTab("imported")}>
            Imported ({records.length})
          </TabButton>
          <TabButton active={activeTab === "skipped"} onClick={() => setActiveTab("skipped")}>
            Skipped ({skipped.length})
          </TabButton>
        </div>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover"
        >
          Import another file
        </button>
      </div>

      {activeTab === "imported" ? (
        <DataTable
          columns={IMPORTED_COLUMNS}
          rows={records}
          emptyMessage="No records were successfully imported"
          maxHeightClass="max-h-[32rem]"
        />
      ) : (
        <DataTable
          columns={skippedColumns}
          rows={skippedRows}
          emptyMessage="Nothing was skipped"
          maxHeightClass="max-h-[32rem]"
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent text-accent-fg" : "text-fg-muted hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}
