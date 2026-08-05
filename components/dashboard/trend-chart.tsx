import { cn } from "@/lib/utils";

// Dependency-free SVG-free bar chart (pure divs) for revenue / orders
// trends. Every bar exposes a native <title> tooltip with the formatted
// value so colour never carries the information alone.

export function BarChart({
  data,
  height = 160,
  formatValue = (value) => String(value),
  className,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelHeight = 16;

  return (
    <div
      className={cn("flex items-end gap-1.5", className)}
      style={{ height }}
      role="img"
      aria-label="Trend chart"
    >
      {data.map((d) => {
        const barHeight = Math.max(
          4,
          Math.round((d.value / max) * (height - labelHeight)),
        );
        return (
          <div
            key={d.label}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                title={`${d.label}: ${formatValue(d.value)}`}
                className="w-full rounded-t-md bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: barHeight }}
              />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
