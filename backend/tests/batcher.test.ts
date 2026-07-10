import { describe, expect, it } from "vitest";
import { createBatches } from "../src/services/batcher";

describe("createBatches", () => {
  it("splits rows into batches of the given size", () => {
    const rows = Array.from({ length: 55 }, (_, i) => ({ id: i }));
    const batches = createBatches(rows, 25);

    expect(batches).toHaveLength(3);
    expect(batches[0].rows).toHaveLength(25);
    expect(batches[1].rows).toHaveLength(25);
    expect(batches[2].rows).toHaveLength(5);
  });

  it("assigns sequential batchIndex and correct startRowIndex", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const batches = createBatches(rows, 4);

    expect(batches.map((b) => b.batchIndex)).toEqual([0, 1, 2]);
    expect(batches.map((b) => b.startRowIndex)).toEqual([0, 4, 8]);
  });

  it("returns a single batch when rows fit within batchSize", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const batches = createBatches(rows, 25);

    expect(batches).toHaveLength(1);
    expect(batches[0].rows).toEqual(rows);
  });

  it("returns an empty array for empty input", () => {
    expect(createBatches([], 25)).toEqual([]);
  });

  it("throws for a non-positive batch size", () => {
    expect(() => createBatches([{ id: 1 }], 0)).toThrow();
  });
});
