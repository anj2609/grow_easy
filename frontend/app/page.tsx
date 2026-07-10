"use client";

import { useState } from "react";
import type { CrmRecord, SkippedRecord } from "@groweasy/shared";
import { UploadDropzone } from "@/components/UploadDropzone";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { ImportProgress } from "@/components/ImportProgress";
import { ResultsView } from "@/components/ResultsView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseCsvFile, CsvPreviewError } from "@/lib/csv";
import { processImport, ImportRequestError } from "@/lib/api";

type Step = "upload" | "preview" | "processing" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "Processing" },
  { key: "results", label: "Results" },
];

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  const [completedBatches, setCompletedBatches] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [skipped, setSkipped] = useState<SkippedRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  async function handleFileSelected(selected: File) {
    setUploadError(null);

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please upload a .csv file");
      return;
    }

    try {
      const { headers, rows } = await parseCsvFile(selected);
      setFile(selected);
      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setStep("preview");
    } catch (err) {
      const message = err instanceof CsvPreviewError ? err.message : "Failed to parse CSV file";
      setUploadError(message);
    }
  }

  async function handleConfirm() {
    if (!file) return;

    setStep("processing");
    setProcessingError(null);
    setCompletedBatches(0);
    setTotalBatches(0);
    setRecords([]);
    setSkipped([]);

    try {
      await processImport(file, (event) => {
        if (event.type === "progress") {
          setTotalBatches(event.totalBatches);
        } else if (event.type === "batch-result") {
          setRecords((prev) => [...prev, ...event.records]);
          setSkipped((prev) => [...prev, ...event.skipped]);
          setCompletedBatches((prev) => prev + 1);
        } else if (event.type === "done") {
          setTotalRows(event.summary.totalRows);
          setStep("results");
        } else if (event.type === "error") {
          setProcessingError(event.message);
        }
      });
    } catch (err) {
      const message =
        err instanceof ImportRequestError ? err.message : "Failed to process the import";
      setProcessingError(message);
      setStep("preview");
    }
  }

  function handleStartOver() {
    setStep("upload");
    setFile(null);
    setUploadError(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setCompletedBatches(0);
    setTotalBatches(0);
    setRecords([]);
    setSkipped([]);
    setTotalRows(0);
    setProcessingError(null);
  }

  const previewColumns: DataTableColumn<Record<string, string>>[] = previewHeaders.map(
    (header) => ({ key: header, header, width: 180 })
  );

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-black/10 dark:border-white/15 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">GrowEasy CSV Importer</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            AI-powered field mapping for any CRM lead export
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        <StepIndicator current={step} />

        {step === "upload" && (
          <UploadDropzone onFileSelected={handleFileSelected} error={uploadError} />
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {previewRows.length} rows detected · no AI processing yet
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="rounded-lg border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Confirm Import
                </button>
              </div>
            </div>
            {processingError && (
              <p className="text-sm text-red-600 dark:text-red-400">{processingError}</p>
            )}
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
          <ResultsView
            records={records}
            skipped={skipped}
            totalRows={totalRows}
            onStartOver={handleStartOver}
          />
        )}
      </main>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {STEPS.map((s, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                state === "done"
                  ? "bg-blue-600 text-white"
                  : state === "active"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 ring-2 ring-blue-600"
                    : "bg-black/5 dark:bg-white/10 text-neutral-400"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={
                state === "upcoming" ? "text-neutral-400" : "text-neutral-800 dark:text-neutral-200"
              }
            >
              {s.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-2 h-px w-6 bg-black/10 dark:bg-white/15" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
