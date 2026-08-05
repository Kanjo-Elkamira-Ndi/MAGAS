import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-6 border-b px-4 py-3.5 last:border-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-3.5"
              style={{ width: `${Math.min(40 + col * 12, 80)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
