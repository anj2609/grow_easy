import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: generateContentMock };
    },
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
    },
  };
});

import { AIQuotaExceededError, GeminiProvider } from "../src/services/aiExtractor";

describe("GeminiProvider.extractBatch", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("extracts records from the JSON response text", async () => {
    const fakeRecord = { name: "Jane Doe", email: "jane@example.com" };
    generateContentMock.mockResolvedValue({ text: JSON.stringify({ records: [fakeRecord] }) });

    const provider = new GeminiProvider("fake-key", "gemini-flash-latest");
    const result = await provider.extractBatch(["Name", "Email"], [{ Name: "Jane Doe", Email: "jane@example.com" }]);

    expect(result).toEqual([fakeRecord]);
  });

  it("throws when the response has no text", async () => {
    generateContentMock.mockResolvedValue({ text: "" });

    const provider = new GeminiProvider("fake-key", "gemini-flash-latest");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toThrow(
      "did not contain any text"
    );
  });

  it("throws when the record count does not match the input row count", async () => {
    generateContentMock.mockResolvedValue({ text: JSON.stringify({ records: [] }) });

    const provider = new GeminiProvider("fake-key", "gemini-flash-latest");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toThrow(
      "AI returned 0 records for a batch of 1 rows"
    );
  });

  it("throws AIQuotaExceededError when the API responds with a 429 status", async () => {
    const quotaError = Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 });
    generateContentMock.mockRejectedValue(quotaError);

    const provider = new GeminiProvider("fake-key", "gemini-flash-latest");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toBeInstanceOf(
      AIQuotaExceededError
    );
  });
});
