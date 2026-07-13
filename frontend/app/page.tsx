"use client";

import { useMemo } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { StepIndicator } from "@/components/StepIndicator";
import { ImportProgress } from "@/components/ImportProgress";
import { ResultsView } from "@/components/ResultsView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useImportWizard } from "@/lib/useImportWizard";

export default function Home() {
  const {
    step,
    file,
    uploadError,
    previewHeaders,
    previewRows,
    completedBatches,
    totalBatches,
    records,
    skipped,
    totalRows,
    processingError,
    handleFileSelected,
    handleConfirm,
    handleStartOver,
  } = useImportWizard();

  const previewColumns = useMemo<DataTableColumn<Record<string, string>>[]>(
    () => previewHeaders.map((header) => ({ key: header, header, width: 180 })),
    [previewHeaders]
  );

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">GrowEasy CSV Importer</h1>
          <p className="text-xs text-fg-muted">AI-powered field mapping for any CRM lead export</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        <StepIndicator current={step} />

        {step === "upload" && <UploadDropzone onFileSelected={handleFileSelected} error={uploadError} />}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-fg-muted">{previewRows.length} rows detected · no AI processing yet</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
                >
                  Confirm Import
                </button>
              </div>
            </div>
            {processingError && <p className="text-sm text-danger">{processingError}</p>}
            <DataTable columns={previewColumns} rows={previewRows} maxHeightClass="max-h-[32rem]" />
          </div>
        )}

        {step === "processing" && (
          <ImportProgress
            completedBatches={completedBatches}
            totalBatches={totalBatches}
            importedCount={records.length}
            skippedCount={skipped.length}
          />
        )}

        {step === "results" && (
          <div className="flex flex-col gap-4">
            {processingError && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                {processingError}
              </p>
            )}
            <ResultsView records={records} skipped={skipped} totalRows={totalRows} onStartOver={handleStartOver} />
          </div>
        )}
      </main>
    </div>
  );
}
