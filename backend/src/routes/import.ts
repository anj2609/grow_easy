import { Router } from "express";
import { CrmRecord, ImportStreamEvent, SkippedRecord } from "@groweasy/shared";
import { csvUpload } from "../middleware/upload";
import { HttpError } from "../middleware/errorHandler";
import { parseCsvBuffer } from "../services/csvParser";
import { createBatches } from "../services/batcher";
import { createAIProvider } from "../services/aiExtractor";
import { postProcessRecord } from "../services/postProcess";
import { withRetry } from "../lib/retry";
import { config } from "../config";
import pLimit from "p-limit";

export const importRouter = Router();

function writeEvent(res: import("express").Response, event: ImportStreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

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

    const batchTasks = batches.map((batch) =>
      limit(async () => {
        writeEvent(res, {
          type: "progress",
          batchIndex: batch.batchIndex,
          totalBatches: batches.length,
        });

        const localRecords: CrmRecord[] = [];
        const localSkipped: SkippedRecord[] = [];

        try {
          const extracted = await withRetry((attempt) => {
            void attempt;
            return aiProvider.extractBatch(headers, batch.rows);
          });

          extracted.forEach((raw, i) => {
            const rowIndex = batch.startRowIndex + i;
            const { record, skipped } = postProcessRecord(raw, rowIndex, batch.rows[i]);
            if (record) localRecords.push(record);
            if (skipped) localSkipped.push(skipped);
          });
        } catch (batchErr) {
          console.error(`Batch ${batch.batchIndex} failed after retries:`, batchErr);
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

    res.end();
  });
});
