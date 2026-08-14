import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";

// Generic fallback for a role's loading.tsx — rendered inside DashboardShell
// (the layout stays mounted) while a page segment's data is fetched. Not
// page-specific on purpose: every dashboard page follows the same
// header + stat row + table shape, so one skeleton covers all of them
// without adding a loading.tsx per route.
export function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
