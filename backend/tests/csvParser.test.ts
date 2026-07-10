import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsvBuffer } from "../src/services/csvParser";

describe("parseCsvBuffer", () => {
  it("parses headers and rows", () => {
    const csv = "Name,Email\nJohn,john@example.com\nJane,jane@example.com";
    const { headers, rows } = parseCsvBuffer(Buffer.from(csv));

    expect(headers).toEqual(["Name", "Email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Name: "John", Email: "john@example.com" });
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const csv = "﻿Name,Email\nJohn,john@example.com";
    const { headers } = parseCsvBuffer(Buffer.from(csv));

    expect(headers[0]).toBe("Name");
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'Name,Note\n"Doe, John","Called, left voicemail"';
    const { rows } = parseCsvBuffer(Buffer.from(csv));

    expect(rows[0].Name).toBe("Doe, John");
    expect(rows[0].Note).toBe("Called, left voicemail");
  });

  it("skips fully empty rows", () => {
    const csv = "Name,Email\nJohn,john@example.com\n,\nJane,jane@example.com";
    const { rows } = parseCsvBuffer(Buffer.from(csv));

    expect(rows).toHaveLength(2);
  });

  it("trims whitespace from header names", () => {
    const csv = " Name , Email \nJohn,john@example.com";
    const { headers } = parseCsvBuffer(Buffer.from(csv));

    expect(headers).toEqual(["Name", "Email"]);
  });

  it("throws CsvParseError when there are no data rows", () => {
    const csv = "Name,Email\n";
    expect(() => parseCsvBuffer(Buffer.from(csv))).toThrow(CsvParseError);
  });

  it("throws CsvParseError when the file is empty", () => {
    expect(() => parseCsvBuffer(Buffer.from(""))).toThrow(CsvParseError);
  });
});
