"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

type SortState = { key: string; dir: "asc" | "desc" };

export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading = false,
  searchKeys,
  searchPlaceholder,
  defaultSort,
  pageSize = 10,
  empty,
  rowClick,
  className,
}: {
  columns: DataColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  searchKeys?: Array<(row: T) => string>;
  searchPlaceholder?: string;
  defaultSort?: SortState;
  pageSize?: number;
  empty?: { title: string; description: string; action?: React.ReactNode };
  rowClick?: (row: T) => void;
  className?: string;
}) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys?.length) return data;
    const needle = query.trim().toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => key(row).toLowerCase().includes(needle)),
    );
  }, [data, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const valueOf = col.sortValue ?? ((row: T) => String(row[col.key as keyof T] ?? ""));
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {searchKeys !== undefined && searchKeys.length > 0 && (
        <div className="relative max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder ?? "Search…"}
            className="pl-9"
            aria-label="Search table"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-foreground"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${45 + ((i * 7) % 40)}%` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-4 py-10">
                  <EmptyState
                    className="border-0"
                    title={empty?.title ?? "Nothing here yet"}
                    description={
                      empty?.description ??
                      (query ? "No rows match your search." : "No records to display.")
                    }
                    action={empty?.action}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={rowClick ? () => rowClick(row) : undefined}
                  className={cn(rowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {sorted.length > pageSize && (
          <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {sorted.length === 0 ? 0 : safePage * pageSize + 1}
                {pageRows.length > 1 && `–${safePage * pageSize + pageRows.length}`}
              </span>{" "}
              of <span className="font-medium text-foreground">{sorted.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Previous page"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <span className="min-w-10 text-center text-xs text-muted-foreground">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Next page"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
