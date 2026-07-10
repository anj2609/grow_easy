import Anthropic from "@anthropic-ai/sdk";
import { CRM_FIELDS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES, CrmRecord } from "@groweasy/shared";
import { config } from "../config";

export interface AIProvider {
  extractBatch(headers: string[], rows: Record<string, string>[]): Promise<CrmRecord[]>;
}

const TOOL_NAME = "submit_crm_records";

const FIELD_PROPERTIES: Record<keyof CrmRecord, { type: "string"; enum?: readonly string[] }> = {
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
  crm_status: { type: "string", enum: [...CRM_STATUS_VALUES, ""] },
  crm_note: { type: "string" },
  data_source: { type: "string", enum: [...DATA_SOURCE_VALUES, ""] },
  possession_time: { type: "string" },
  description: { type: "string" },
};

const RECORD_SCHEMA = {
  type: "object" as const,
  properties: FIELD_PROPERTIES,
  required: CRM_FIELDS,
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a data-mapping engine for GrowEasy CRM. You receive rows from an arbitrary,
messy CSV export (Facebook lead ads, Google Ads, real-estate CRM exports, sales reports, manually
made spreadsheets, etc.) and must map each row onto this fixed CRM schema:

- created_at: lead creation date/time. Must be a value JavaScript's \`new Date(x)\` can parse
  (prefer "YYYY-MM-DD HH:mm:ss" or ISO 8601). If no usable date exists, leave it "".
- name: the lead's full name.
- email: the lead's primary email address.
- country_code: phone country code, e.g. "+91". Infer from context (country, phone format) when
  possible; otherwise "".
- mobile_without_country_code: phone number WITHOUT the country code, digits only where possible.
- company: company/organization name.
- city, state, country: location fields.
- lead_owner: the salesperson/agent/user who owns this lead (often an email or name).
- crm_status: MUST be exactly one of "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD",
  "SALE_DONE", or "" if nothing in the row maps to one of these confidently. Never invent a
  status that isn't in this list.
- crm_note: remarks, follow-up notes, comments, and any extra useful information that doesn't fit
  another field. Also used to hold overflow emails/phone numbers (see rule below).
- data_source: MUST be exactly one of "leads_on_demand", "meridian_tower", "eden_park",
  "varah_swamy", "sarjapur_plots", or "" if nothing matches confidently. Never invent a value
  outside this list.
- possession_time: property possession timeframe, if this is a real-estate lead.
- description: any additional descriptive text about the lead that doesn't belong elsewhere.

Rules:
1. Column names vary wildly between sources. Map by meaning, not by exact header text. Examples:
   "Contact No" / "Phone" / "WhatsApp Number" / "Mobile" -> mobile_without_country_code.
   "Lead Date" / "Created On" / "Submitted At" / "Date" -> created_at.
   "Remarks" / "Comments" / "Notes" -> crm_note.
   "Assigned To" / "Agent" / "Owner" / "Sales Rep" -> lead_owner.
   "Campaign" / "Source" / "Ad Set" -> data_source, ONLY if it confidently matches the allowed
   list; otherwise put the raw value in crm_note and leave data_source "".
   "Full Name" / "Lead Name" / "Contact Name" / first+last name columns combined -> name.
2. If a row contains multiple email addresses (e.g. separated by commas/semicolons, or spread
   across multiple columns), use the first one as email and append the rest into crm_note (e.g.
   "Additional emails: a@x.com, b@x.com").
3. If a row contains multiple phone numbers, use the first as mobile_without_country_code and
   append the rest into crm_note (e.g. "Additional phones: 91234, 98765").
4. Never put a raw newline character inside any field's value. If you need to represent a line
   break within a field (e.g. multi-line notes), use the two characters backslash-n instead of an
   actual newline, so the value stays safe as a single CSV cell.
5. Every field is a string. Use "" (empty string) for any field you cannot confidently fill —
   never guess, never use placeholder text like "N/A" or "Unknown".
6. Extract a best-effort record for every input row, even if it looks mostly empty or invalid —
   downstream code decides whether to keep or skip it. Do not omit rows from your output.
7. Respond by calling the ${TOOL_NAME} tool exactly once, with a "records" array that has exactly
   one object per input row, in the exact same order as the input rows.`;

function buildUserMessage(headers: string[], rows: Record<string, string>[]): string {
  const payload = rows.map((row, index) => ({
    rowIndex: index,
    data: row,
  }));

  return [
    `CSV headers: ${JSON.stringify(headers)}`,
    `Rows (${rows.length}):`,
    JSON.stringify(payload, null, 2),
  ].join("\n\n");
}

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
                items: RECORD_SCHEMA,
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

    const records = (toolUse.input as { records?: unknown }).records;

    if (!Array.isArray(records)) {
      throw new Error("AI response 'records' field is not an array");
    }

    if (records.length !== rows.length) {
      throw new Error(
        `AI returned ${records.length} records for a batch of ${rows.length} rows`
      );
    }

    return records as CrmRecord[];
  }
}

export function createAIProvider(): AIProvider {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new AnthropicProvider(config.anthropicApiKey, config.anthropicModel);
}
