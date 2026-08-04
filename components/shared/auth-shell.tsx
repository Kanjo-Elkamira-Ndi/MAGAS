"use client";

import { Check, Flame } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * AuthShell — split-screen auth layout (matches the 21st sign-in-6
 * pattern, adapted to our tokens and primitives). Left panel is a dark
 * "cinema" brand panel that holds its look in both themes; the form
 * surface sits on the right and follows the active theme.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  highlights,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  highlights: { title: string; description: string }[];
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 lg:flex lg:flex-col">
        <div className="animate-aurora absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary/25 blur-[130px]" />
        <div className="animate-aurora absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-[120px] [animation-delay:-10s]" />

        <div className="relative flex h-full flex-col p-12">
          <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="MAGAS home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flame aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-bold tracking-tight text-stone-50">
              MAGAS
            </span>
          </Link>

          <div className="mt-auto max-w-md">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-stone-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {eyebrow}
            </span>
            <h1 className="mt-5 text-3xl leading-[1.15] font-bold tracking-tight text-balance text-stone-50 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 leading-relaxed text-stone-400">{subtitle}</p>

            <ul className="mt-8 space-y-3">
              {highlights.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
                    <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-200">
                      {item.title}
                    </p>
                    <p className="text-xs text-stone-400">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Form surface */}
      <div className="relative flex flex-col bg-background">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}
