import { cn } from "@/lib/utils";

export function InitialAvatar({
  name,
  email,
  className,
}: {
  name?: string | null;
  email?: string | null;
  className?: string;
}) {
  const source = (name || email || "?").trim();
  const initials = source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 select-none items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}
