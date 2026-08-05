import { Flame, Truck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";

export default async function AgentPlaceholderPage() {
  const session = await requireRole("agent");
  const email = session.user.email ?? "there";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Truck aria-hidden="true" className="size-8" />
      </span>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight">
          The agent app is coming soon
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Delivery agents will soon use MAGAS to accept assignments, view
          drop-off details, and confirm deliveries on the go. You&apos;re
          signed in as {email} — we&apos;ll notify you when this surface is
          live.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <Flame aria-hidden="true" className="size-3.5 text-primary" />
        Phase 1 — agent dashboard
      </div>
    </div>
  );
}
