import { memo } from "react";
import { TONE_TEXT_CLASSES, Tone } from "@/lib/theme";

interface SummaryCardProps {
  label: string;
  value: number;
  tone?: Tone;
}

/** Reusable stat card used for the import result summary (Total / Imported / Skipped). */
export const SummaryCard = memo(function SummaryCard({ label, value, tone = "neutral" }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${TONE_TEXT_CLASSES[tone]}`}>{value}</p>
    </div>
  );
});
