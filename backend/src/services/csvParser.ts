import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export class CsvParseError extends Error {}

/**
 * Parses a raw CSV buffer with no assumptions about column names — the caller decides what to
 * do with `headers`/`rows`. Strips a UTF-8 BOM (common in Excel exports) and drops blank rows.
 */
export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  const text = buffer.toString("utf-8").replace(/^﻿/, "");

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
    if (fatal) {
      throw new CsvParseError(`Failed to parse CSV: ${fatal.message}`);
    }
  }

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    throw new CsvParseError("CSV has no header row");
  }

  const rows = result.data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim().length > 0)
  );

  if (rows.length === 0) {
    throw new CsvParseError("CSV has no data rows");
  }

  return { headers, rows };
}
