import { memo } from "react";
import { TONE_BADGE_CLASSES, Tone } from "@/lib/theme";

interface StatusBadgeProps {
  label: string;
  tone: Tone;
}

/** Reusable colored pill driven entirely by the semantic token map in lib/theme.ts. */
export const StatusBadge = memo(function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_BADGE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
});
