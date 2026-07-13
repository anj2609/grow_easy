/**
 * Contract shared by the backend and frontend workspaces: the fixed GrowEasy CRM
 * schema, the closed enums the AI must map into, and the NDJSON streaming events
 * exchanged between `POST /api/import/process` and the frontend.
 */

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

export const CRM_FIELDS: readonly (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

/** Reasons a row was deterministically excluded from the imported set (see postProcess.ts). */
export const SKIP_REASON_VALUES = [
  "missing_email_and_mobile",
  "ai_processing_failed",
] as const;

export type SkipReason = (typeof SKIP_REASON_VALUES)[number];

export interface SkippedRecord {
  rowIndex: number;
  originalRow: Record<string, string>;
  reason: SkipReason;
}

export interface ImportSummary {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export type ImportStreamEvent =
  | { type: "progress"; batchIndex: number; totalBatches: number }
  | { type: "batch-result"; records: CrmRecord[]; skipped: SkippedRecord[] }
  | { type: "error"; message: string }
  | { type: "done"; summary: ImportSummary };
