export interface Batch<T> {
  batchIndex: number;
  startRowIndex: number;
  rows: T[];
}

export function createBatches<T>(rows: T[], batchSize: number): Batch<T>[] {
  if (batchSize <= 0) {
    throw new Error("batchSize must be greater than 0");
  }

  const batches: Batch<T>[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push({
      batchIndex: batches.length,
      startRowIndex: i,
      rows: rows.slice(i, i + batchSize),
    });
  }
  return batches;
}
