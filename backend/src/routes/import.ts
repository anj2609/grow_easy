import { Response, Router } from "express";
import pLimit from "p-limit";
import { CrmRecord, ImportStreamEvent, SkippedRecord } from "@groweasy/shared";
import { csvUpload } from "../middleware/upload";
import { HttpError } from "../middleware/errorHandler";
import { parseCsvBuffer } from "../services/csvParser";
import { createBatches } from "../services/batcher";
import { createAIProvider, AIQuotaExceededError } from "../services/aiExtractor";
import { postProcessRecord } from "../services/postProcess";
import { withRetry } from "../lib/retry";
import { config } from "../config";

export const importRouter = Router();

function writeEvent(res: Response, event: ImportStreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

/**
 * The only import endpoint. Parses the uploaded CSV (no fixed column assumptions), splits rows
 * into batches, and streams NDJSON events back as each batch is extracted by the AI provider —
 * so the frontend gets incremental progress instead of waiting for the whole file to finish.
 */
importRouter.post("/process", (req, res, next) => {
  csvUpload(req, res, async (uploadErr) => {
    if (uploadErr) {
      next(uploadErr);
      return;
    }

    if (!req.file) {
      next(new HttpError(400, "missing_file", "No CSV file was uploaded"));
      return;
    }

    let parsed;
    try {
      parsed = parseCsvBuffer(req.file.buffer);
    } catch (parseErr) {
      next(parseErr);
      return;
    }

    let aiProvider;
    try {
      aiProvider = createAIProvider();
    } catch (providerErr) {
      next(providerErr);
      return;
    }

    const { headers, rows } = parsed;
    const batches = createBatches(rows, config.batchSize);
    const limit = pLimit(config.batchConcurrency);

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    });

    const importedRecords: CrmRecord[] = [];
    const skippedRecords: SkippedRecord[] = [];
    // Once a provider reports its quota/rate limit is exhausted, every other batch would fail
    // the same way — stop calling the AI for the rest of the import instead of burning through
    // what little quota may be left, and tell the client why via a dedicated `error` event.
    let quotaErrorMessage: string | null = null;

    try {
      const batchTasks = batches.map((batch) =>
        limit(async () => {
          if (quotaErrorMessage) {
            const localSkipped: SkippedRecord[] = batch.rows.map((row, i) => ({
              rowIndex: batch.startRowIndex + i,
              originalRow: row,
              reason: "ai_processing_failed",
            }));
            skippedRecords.push(...localSkipped);
            writeEvent(res, { type: "batch-result", records: [], skipped: localSkipped });
            return;
          }

          writeEvent(res, {
            type: "progress",
            batchIndex: batch.batchIndex,
            totalBatches: batches.length,
          });

          const localRecords: CrmRecord[] = [];
          const localSkipped: SkippedRecord[] = [];

          try {
            const extracted = await withRetry(() => aiProvider.extractBatch(headers, batch.rows), {
              isRetryable: (err) => !(err instanceof AIQuotaExceededError),
            });

            extracted.forEach((raw, i) => {
              const rowIndex = batch.startRowIndex + i;
              const { record, skipped } = postProcessRecord(raw, rowIndex, batch.rows[i]);
              if (record) localRecords.push(record);
              if (skipped) localSkipped.push(skipped);
            });
          } catch (batchErr) {
            // A batch that fails after retries is not fatal for the whole import — its rows are
            // marked skipped so the rest of the file can still be imported.
            console.error(`Batch ${batch.batchIndex} failed after retries:`, batchErr);
            if (batchErr instanceof AIQuotaExceededError && !quotaErrorMessage) {
              quotaErrorMessage = batchErr.message;
              writeEvent(res, { type: "error", message: quotaErrorMessage });
            }
            batch.rows.forEach((row, i) => {
              localSkipped.push({
                rowIndex: batch.startRowIndex + i,
                originalRow: row,
                reason: "ai_processing_failed",
              });
            });
          }

          importedRecords.push(...localRecords);
          skippedRecords.push(...localSkipped);

          writeEvent(res, {
            type: "batch-result",
            records: localRecords,
            skipped: localSkipped,
          });
        })
      );

      await Promise.all(batchTasks);

      writeEvent(res, {
        type: "done",
        summary: {
          totalRows: rows.length,
          totalImported: importedRecords.length,
          totalSkipped: skippedRecords.length,
        },
      });
    } catch (streamErr) {
      // Headers are already sent by this point, so a JSON error response (errorHandler) isn't
      // possible — surface the failure as a stream event instead so the client can react.
      console.error("Import stream failed:", streamErr);
      writeEvent(res, {
        type: "error",
        message: "Import failed unexpectedly while streaming results",
      });
    } finally {
      res.end();
    }
  });
});
