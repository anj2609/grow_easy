import Papa from "papaparse";

export interface ParsedCsvPreview {
  headers: string[];
  rows: Record<string, string>[];
}

export class CsvPreviewError extends Error {}

export function parseCsvFile(file: File): Promise<ParsedCsvPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new CsvPreviewError("CSV has no header row"));
          return;
        }

        const rows = result.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim().length > 0)
        );

        if (rows.length === 0) {
          reject(new CsvPreviewError("CSV has no data rows"));
          return;
        }

        resolve({ headers, rows });
      },
      error: (error: Error) => {
        reject(new CsvPreviewError(error.message));
      },
    });
  });
}
