import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  CrmRecord,
  SkippedRecord,
} from "@groweasy/shared";

export interface PostProcessResult {
  record: CrmRecord | null;
  skipped: SkippedRecord | null;
}

function sanitizeField(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n|\r|\n/g, "\\n").trim();
}

function isValidDate(value: string): boolean {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
}

export function sanitizeRecord(raw: Partial<CrmRecord>): CrmRecord {
  const record = {} as CrmRecord;
  for (const field of CRM_FIELDS) {
    record[field] = sanitizeField(raw[field]) as never;
  }

  if (!(CRM_STATUS_VALUES as readonly string[]).includes(record.crm_status)) {
    record.crm_status = "";
  }

  if (!(DATA_SOURCE_VALUES as readonly string[]).includes(record.data_source)) {
    record.data_source = "";
  }

  if (!isValidDate(record.created_at)) {
    record.created_at = "";
  }

  return record;
}

export function postProcessRecord(
  raw: Partial<CrmRecord>,
  rowIndex: number,
  originalRow: Record<string, string>
): PostProcessResult {
  const record = sanitizeRecord(raw);

  if (!record.email && !record.mobile_without_country_code) {
    return {
      record: null,
      skipped: {
        rowIndex,
        originalRow,
        reason: "missing_email_and_mobile",
      },
    };
  }

  return { record, skipped: null };
}
