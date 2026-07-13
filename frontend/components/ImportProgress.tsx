import { memo } from "react";

interface ImportProgressProps {
  completedBatches: number;
  totalBatches: number;
  importedCount: number;
  skippedCount: number;
}

export const ImportProgress = memo(function ImportProgress({
  completedBatches,
  totalBatches,
  importedCount,
  skippedCount,
}: ImportProgressProps) {
  const percent = totalBatches === 0 ? 0 : Math.round((completedBatches / totalBatches) * 100);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-soft border-t-accent" />
      <p className="text-sm font-medium">
        Processing batch {Math.min(completedBatches + 1, totalBatches)} of {totalBatches || "…"}
      </p>
      <div className="w-full h-2 rounded-full bg-neutral-soft overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-fg-muted">
        {importedCount} imported so far · {skippedCount} skipped so far
      </p>
    </div>
  );
});
