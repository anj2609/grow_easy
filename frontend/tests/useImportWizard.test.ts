import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useImportWizard } from "../lib/useImportWizard";

function toFile(content: string, name = "test.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("useImportWizard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts on the upload step with empty result state", () => {
    const { result } = renderHook(() => useImportWizard());

    expect(result.current.step).toBe("upload");
    expect(result.current.records).toEqual([]);
    expect(result.current.skipped).toEqual([]);
  });

  it("rejects a non-.csv file without leaving the upload step", async () => {
    const { result } = renderHook(() => useImportWizard());

    await act(async () => {
      await result.current.handleFileSelected(toFile("not a csv", "notes.txt"));
    });

    expect(result.current.step).toBe("upload");
    expect(result.current.uploadError).toBe("Please upload a .csv file");
  });

  it("parses a valid CSV client-side and advances to preview without any network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderHook(() => useImportWizard());

    await act(async () => {
      await result.current.handleFileSelected(toFile("Name,Email\nJohn,john@example.com"));
    });

    expect(result.current.step).toBe("preview");
    expect(result.current.previewHeaders).toEqual(["Name", "Email"]);
    expect(result.current.previewRows).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resets to the upload step and clears all state on start over", async () => {
    const { result } = renderHook(() => useImportWizard());

    await act(async () => {
      await result.current.handleFileSelected(toFile("Name,Email\nJohn,john@example.com"));
    });
    act(() => {
      result.current.handleStartOver();
    });

    expect(result.current.step).toBe("upload");
    expect(result.current.file).toBeNull();
    expect(result.current.previewHeaders).toEqual([]);
  });

  it("streams NDJSON progress/batch-result/done events into records, skipped, and totals", async () => {
    const encoder = new TextEncoder();
    const events = [
      { type: "progress", batchIndex: 0, totalBatches: 1 },
      {
        type: "batch-result",
        records: [{ name: "John", email: "john@example.com" }],
        skipped: [{ rowIndex: 1, originalRow: {}, reason: "missing_email_and_mobile" }],
      },
      { type: "done", summary: { totalRows: 2, totalImported: 1, totalSkipped: 1 } },
    ];
    const body = events.map((e) => `${JSON.stringify(e)}\n`).join("");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let sent = false;
          return {
            read: async () => {
              if (sent) return { done: true, value: undefined };
              sent = true;
              return { done: false, value: encoder.encode(body) };
            },
          };
        },
      },
    } as unknown as Response);

    const { result } = renderHook(() => useImportWizard());

    await act(async () => {
      await result.current.handleFileSelected(toFile("Name,Email\nJohn,john@example.com\nJane,"));
    });
    await act(async () => {
      await result.current.handleConfirm();
    });

    await waitFor(() => expect(result.current.step).toBe("results"));
    expect(result.current.records).toHaveLength(1);
    expect(result.current.skipped).toHaveLength(1);
    expect(result.current.totalRows).toBe(2);
  });
});
