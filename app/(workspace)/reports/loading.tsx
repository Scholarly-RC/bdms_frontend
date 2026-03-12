import { Skeleton } from "@/components/ui/skeleton";

const REPORT_ROW_SKELETON_KEYS = [
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "row-5",
] as const;

export default function ReportsLoading() {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </header>

      <div className="rounded-xl border border-zinc-300/70 bg-white/82 backdrop-blur-sm">
        <div className="p-6">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16 justify-self-end" />
          </div>

          <Skeleton className="my-4 h-px w-full" />

          <div className="space-y-4">
            {REPORT_ROW_SKELETON_KEYS.map((rowKey) => (
              <div
                key={`report-row-skeleton-${rowKey}`}
                className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-52 max-w-full" />
                  <Skeleton className="h-3 w-44 max-w-full" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <div className="flex items-center justify-end gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
