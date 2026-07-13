import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

import { AIQuotaExceededError, AnthropicProvider } from "../src/services/aiExtractor";

describe("AnthropicProvider.extractBatch", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("extracts records from the tool_use block", async () => {
    const fakeRecord = { name: "Jane Doe", email: "jane@example.com" };
    createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "submit_crm_records", input: { records: [fakeRecord] } }],
    });

    const provider = new AnthropicProvider("fake-key", "claude-sonnet-5");
    const result = await provider.extractBatch(["Name", "Email"], [{ Name: "Jane Doe", Email: "jane@example.com" }]);

    expect(result).toEqual([fakeRecord]);
  });

  it("throws when the response has no tool_use block", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "no tool call" }] });

    const provider = new AnthropicProvider("fake-key", "claude-sonnet-5");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toThrow(
      "did not contain a tool_use block"
    );
  });

  it("throws when the record count does not match the input row count", async () => {
    createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "submit_crm_records", input: { records: [] } }],
    });

    const provider = new AnthropicProvider("fake-key", "claude-sonnet-5");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toThrow(
      "AI returned 0 records for a batch of 1 rows"
    );
  });

  it("throws AIQuotaExceededError when the API responds with a 429 status", async () => {
    const rateLimitError = Object.assign(new Error("rate limited"), { status: 429 });
    createMock.mockRejectedValue(rateLimitError);

    const provider = new AnthropicProvider("fake-key", "claude-sonnet-5");
    await expect(provider.extractBatch(["Name"], [{ Name: "Jane" }])).rejects.toBeInstanceOf(
      AIQuotaExceededError
    );
  });
});
