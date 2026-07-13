import { memo } from "react";
import type { WizardStep } from "@/lib/useImportWizard";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "Processing" },
  { key: "results", label: "Results" },
];

interface StepIndicatorProps {
  current: WizardStep;
}

export const StepIndicator = memo(function StepIndicator({ current }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {STEPS.map((s, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "active" : "upcoming";
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                state === "done"
                  ? "bg-accent text-accent-fg"
                  : state === "active"
                    ? "bg-accent-soft text-accent ring-2 ring-accent"
                    : "bg-neutral-soft text-fg-muted"
              }`}
            >
              {index + 1}
            </span>
            <span className={state === "upcoming" ? "text-fg-muted" : "text-fg"}>{s.label}</span>
            {index < STEPS.length - 1 && <span className="mx-2 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
});
