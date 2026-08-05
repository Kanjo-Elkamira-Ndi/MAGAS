import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "info";

const TONE_TEXT: Record<StatTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

const TONE_CHIP: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              TONE_CHIP[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", TONE_TEXT[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
