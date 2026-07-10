import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, Type } from "@google/genai";
import { CRM_FIELDS, CrmRecord } from "@groweasy/shared";
import { config } from "../config";
import { SYSTEM_PROMPT, buildUserMessage, CRM_STATUS_ENUM, DATA_SOURCE_ENUM } from "./aiPrompt";

export interface AIProvider {
  extractBatch(headers: string[], rows: Record<string, string>[]): Promise<CrmRecord[]>;
}

function assertRecordCount(records: unknown, expected: number): CrmRecord[] {
  if (!Array.isArray(records)) {
    throw new Error("AI response 'records' field is not an array");
  }
  if (records.length !== expected) {
    throw new Error(`AI returned ${records.length} records for a batch of ${expected} rows`);
  }
  return records as CrmRecord[];
}

const TOOL_NAME = "submit_crm_records";

const ANTHROPIC_FIELD_PROPERTIES: Record<
  keyof CrmRecord,
  { type: "string"; enum?: readonly string[] }
> = {
  created_at: { type: "string" },
  name: { type: "string" },
  email: { type: "string" },
  country_code: { type: "string" },
  mobile_without_country_code: { type: "string" },
  company: { type: "string" },
  city: { type: "string" },
  state: { type: "string" },
  country: { type: "string" },
  lead_owner: { type: "string" },
  crm_status: { type: "string", enum: CRM_STATUS_ENUM },
  crm_note: { type: "string" },
  data_source: { type: "string", enum: DATA_SOURCE_ENUM },
  possession_time: { type: "string" },
  description: { type: "string" },
};

const ANTHROPIC_RECORD_SCHEMA = {
  type: "object" as const,
  properties: ANTHROPIC_FIELD_PROPERTIES,
  required: CRM_FIELDS,
  additionalProperties: false,
};

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async extractBatch(headers: string[], rows: Record<string, string>[]): Promise<CrmRecord[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description: "Submit the extracted CRM records for this batch, one per input row, in order.",
          input_schema: {
            type: "object",
            properties: {
              records: {
                type: "array",
                items: ANTHROPIC_RECORD_SCHEMA,
              },
            },
            required: ["records"],
          },
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: buildUserMessage(headers, rows) }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      throw new Error("AI response did not contain a tool_use block");
    }

    return assertRecordCount((toolUse.input as { records?: unknown }).records, rows.length);
  }
}

function geminiStringField(enumValues?: readonly string[]) {
  return {
    type: Type.STRING,
    ...(enumValues ? { enum: [...enumValues] } : {}),
  };
}

const GEMINI_RECORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    created_at: geminiStringField(),
    name: geminiStringField(),
    email: geminiStringField(),
    country_code: geminiStringField(),
    mobile_without_country_code: geminiStringField(),
    company: geminiStringField(),
    city: geminiStringField(),
    state: geminiStringField(),
    country: geminiStringField(),
    lead_owner: geminiStringField(),
    crm_status: geminiStringField(CRM_STATUS_ENUM),
    crm_note: geminiStringField(),
    data_source: geminiStringField(DATA_SOURCE_ENUM),
    possession_time: geminiStringField(),
    description: geminiStringField(),
  },
  required: CRM_FIELDS,
  propertyOrdering: CRM_FIELDS,
};

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async extractBatch(headers: string[], rows: Record<string, string>[]): Promise<CrmRecord[]> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: buildUserMessage(headers, rows),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            records: { type: Type.ARRAY, items: GEMINI_RECORD_SCHEMA },
          },
          required: ["records"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI response did not contain any text");
    }

    const parsed = JSON.parse(text) as { records?: unknown };
    return assertRecordCount(parsed.records, rows.length);
  }
}

export function createAIProvider(): AIProvider {
  if (config.aiProvider === "anthropic") {
    if (!config.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    return new AnthropicProvider(config.anthropicApiKey, config.anthropicModel);
  }

  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GeminiProvider(config.geminiApiKey, config.geminiModel);
}
