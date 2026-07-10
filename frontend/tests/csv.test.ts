import { describe, expect, it } from "vitest";
import { CsvPreviewError, parseCsvFile } from "../lib/csv";

function toFile(content: string, name = "test.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("parseCsvFile", () => {
  it("parses headers and rows from a File", async () => {
    const file = toFile("Name,Email\nJohn,john@example.com\nJane,jane@example.com");
    const { headers, rows } = await parseCsvFile(file);

    expect(headers).toEqual(["Name", "Email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "John", Email: "john@example.com" });
  });

  it("handles quoted fields containing commas", async () => {
    const file = toFile('Name,Note\n"Doe, John","Called, left voicemail"');
    const { rows } = await parseCsvFile(file);

    expect(rows[0].Name).toBe("Doe, John");
    expect(rows[0].Note).toBe("Called, left voicemail");
  });

  it("skips fully empty rows", async () => {
    const file = toFile("Name,Email\nJohn,john@example.com\n,\nJane,jane@example.com");
    const { rows } = await parseCsvFile(file);

    expect(rows).toHaveLength(2);
  });

  it("rejects with CsvPreviewError when there are no data rows", async () => {
    const file = toFile("Name,Email\n");
    await expect(parseCsvFile(file)).rejects.toBeInstanceOf(CsvPreviewError);
  });
});
