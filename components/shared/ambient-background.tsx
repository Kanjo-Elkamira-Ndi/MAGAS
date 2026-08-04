import { cn } from "@/lib/utils";

/**
 * AmbientBackground — CSS-only animated gradient blobs behind hero
 * content. GPU-friendly transforms, hidden entirely under
 * prefers-reduced-motion (globals.css kills the animation there).
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="animate-aurora absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="animate-aurora absolute top-1/3 -right-32 h-[24rem] w-[24rem] rounded-full bg-primary/15 blur-[110px] [animation-delay:-8s]" />
      <div className="animate-aurora absolute -bottom-40 left-1/4 h-[26rem] w-[26rem] rounded-full bg-foreground/[0.04] blur-[120px] [animation-delay:-15s]" />
    </div>
  );
}
