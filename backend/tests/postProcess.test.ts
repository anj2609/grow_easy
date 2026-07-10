import { describe, expect, it } from "vitest";
import { CrmRecord } from "@groweasy/shared";
import { postProcessRecord, sanitizeRecord } from "../src/services/postProcess";

function makeRawRecord(overrides: Partial<CrmRecord> = {}): Partial<CrmRecord> {
  return {
    created_at: "2026-05-13 14:20:48",
    name: "John Doe",
    email: "john@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543210",
    company: "GrowEasy",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    lead_owner: "test@gmail.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: "",
    data_source: "leads_on_demand",
    possession_time: "",
    description: "",
    ...overrides,
  };
}

describe("sanitizeRecord", () => {
  it("keeps valid enum values as-is", () => {
    const record = sanitizeRecord(makeRawRecord());
    expect(record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(record.data_source).toBe("leads_on_demand");
  });

  it("blanks an invalid crm_status", () => {
    const record = sanitizeRecord(makeRawRecord({ crm_status: "MADE_UP_STATUS" as never }));
    expect(record.crm_status).toBe("");
  });

  it("blanks an invalid data_source", () => {
    const record = sanitizeRecord(makeRawRecord({ data_source: "some_random_campaign" as never }));
    expect(record.data_source).toBe("");
  });

  it("blanks an unparseable created_at", () => {
    const record = sanitizeRecord(makeRawRecord({ created_at: "not a date" }));
    expect(record.created_at).toBe("");
  });

  it("keeps a valid ISO created_at", () => {
    const record = sanitizeRecord(makeRawRecord({ created_at: "2026-05-13T14:20:48Z" }));
    expect(record.created_at).toBe("2026-05-13T14:20:48Z");
  });

  it("collapses raw newlines in text fields into literal \\n", () => {
    const record = sanitizeRecord(makeRawRecord({ crm_note: "Line one\nLine two\r\nLine three" }));
    expect(record.crm_note).toBe("Line one\\nLine two\\nLine three");
  });

  it("defaults missing/non-string fields to empty string", () => {
    const record = sanitizeRecord({ name: "Only Name" });
    expect(record.email).toBe("");
    expect(record.company).toBe("");
  });
});

describe("postProcessRecord", () => {
  it("keeps a record that has an email", () => {
    const { record, skipped } = postProcessRecord(
      makeRawRecord({ mobile_without_country_code: "" }),
      0,
      {}
    );
    expect(skipped).toBeNull();
    expect(record?.email).toBe("john@example.com");
  });

  it("keeps a record that has only a mobile number", () => {
    const { record, skipped } = postProcessRecord(makeRawRecord({ email: "" }), 0, {});
    expect(skipped).toBeNull();
    expect(record?.mobile_without_country_code).toBe("9876543210");
  });

  it("skips a record with neither email nor mobile", () => {
    const originalRow = { Name: "No Contact Info" };
    const { record, skipped } = postProcessRecord(
      makeRawRecord({ email: "", mobile_without_country_code: "" }),
      3,
      originalRow
    );
    expect(record).toBeNull();
    expect(skipped).toEqual({
      rowIndex: 3,
      originalRow,
      reason: "missing_email_and_mobile",
    });
  });
});
