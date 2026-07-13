import type { CrmStatus, SkipReason } from "@groweasy/shared";

/**
 * Single source of truth mapping semantic meaning -> color, so components never hardcode a
 * Tailwind color literal (e.g. "blue-600" or "amber-500"). Every class here is built from the
 * CSS-custom-property tokens defined in app/globals.css, so retheming only ever happens there.
 */
export type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

export const TONE_BADGE_CLASSES: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-neutral",
};

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-fg",
};

const CRM_STATUS_TONE: Record<CrmStatus, Tone> = {
  GOOD_LEAD_FOLLOW_UP: "accent",
  DID_NOT_CONNECT: "warning",
  BAD_LEAD: "danger",
  SALE_DONE: "success",
};

const SKIP_REASON_TONE: Record<SkipReason, Tone> = {
  missing_email_and_mobile: "neutral",
  ai_processing_failed: "danger",
};

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  missing_email_and_mobile: "Missing email & mobile",
  ai_processing_failed: "AI processing failed",
};

export function toneForCrmStatus(status: CrmStatus | ""): Tone {
  return status ? CRM_STATUS_TONE[status] : "neutral";
}

export function toneForSkipReason(reason: SkipReason): Tone {
  return SKIP_REASON_TONE[reason] ?? "neutral";
}
