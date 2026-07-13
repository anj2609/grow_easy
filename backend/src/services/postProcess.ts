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

/**
 * Deterministic safety net applied to every AI-extracted record — the model's output is never
 * trusted blindly. Coerces non-string values to "", escapes raw newlines so records stay
 * single-row-safe in CSV, and blanks any field that fails a hard rule (enum membership,
 * date parseability) instead of trusting whatever the model returned.
 */
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

/** Sanitizes a record, then applies the spec's hard skip rule: no email and no mobile -> skipped. */
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
