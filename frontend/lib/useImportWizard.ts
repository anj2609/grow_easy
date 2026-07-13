"use client";

import { useCallback, useState } from "react";
import type { CrmRecord, SkippedRecord } from "@groweasy/shared";
import { parseCsvFile, CsvPreviewError } from "./csv";
import { processImport, ImportRequestError } from "./api";

export type WizardStep = "upload" | "preview" | "processing" | "results";

export interface ImportWizardState {
  step: WizardStep;
  file: File | null;
  uploadError: string | null;
  previewHeaders: string[];
  previewRows: Record<string, string>[];
  completedBatches: number;
  totalBatches: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
  processingError: string | null;
  handleFileSelected: (file: File) => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleStartOver: () => void;
}

const INITIAL_RESULT_STATE = {
  completedBatches: 0,
  totalBatches: 0,
  records: [] as CrmRecord[],
  skipped: [] as SkippedRecord[],
  totalRows: 0,
};

/**
 * Owns every piece of state for the upload -> preview -> processing -> results wizard so
 * `page.tsx` stays a thin view. Handlers are `useCallback`-wrapped and streaming updates use
 * functional `setState` updaters so each NDJSON line triggers exactly one re-render regardless
 * of import size.
 */
export function useImportWizard(): ImportWizardState {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  const [completedBatches, setCompletedBatches] = useState(INITIAL_RESULT_STATE.completedBatches);
  const [totalBatches, setTotalBatches] = useState(INITIAL_RESULT_STATE.totalBatches);
  const [records, setRecords] = useState<CrmRecord[]>(INITIAL_RESULT_STATE.records);
  const [skipped, setSkipped] = useState<SkippedRecord[]>(INITIAL_RESULT_STATE.skipped);
  const [totalRows, setTotalRows] = useState(INITIAL_RESULT_STATE.totalRows);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (selected: File) => {
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
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;

    setStep("processing");
    setProcessingError(null);
    setCompletedBatches(INITIAL_RESULT_STATE.completedBatches);
    setTotalBatches(INITIAL_RESULT_STATE.totalBatches);
    setRecords(INITIAL_RESULT_STATE.records);
    setSkipped(INITIAL_RESULT_STATE.skipped);

    try {
      await processImport(file, (event) => {
        switch (event.type) {
          case "progress":
            setTotalBatches(event.totalBatches);
            break;
          case "batch-result":
            setRecords((prev) => [...prev, ...event.records]);
            setSkipped((prev) => [...prev, ...event.skipped]);
            setCompletedBatches((prev) => prev + 1);
            break;
          case "done":
            setTotalRows(event.summary.totalRows);
            setStep("results");
            break;
          case "error":
            setProcessingError(event.message);
            break;
        }
      });
    } catch (err) {
      const message = err instanceof ImportRequestError ? err.message : "Failed to process the import";
      setProcessingError(message);
      setStep("preview");
    }
  }, [file]);

  const handleStartOver = useCallback(() => {
    setStep("upload");
    setFile(null);
    setUploadError(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setCompletedBatches(INITIAL_RESULT_STATE.completedBatches);
    setTotalBatches(INITIAL_RESULT_STATE.totalBatches);
    setRecords(INITIAL_RESULT_STATE.records);
    setSkipped(INITIAL_RESULT_STATE.skipped);
    setTotalRows(INITIAL_RESULT_STATE.totalRows);
    setProcessingError(null);
  }, []);

  return {
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
  };
}
