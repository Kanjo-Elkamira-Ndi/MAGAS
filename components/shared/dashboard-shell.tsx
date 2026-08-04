"use client";

import { Flame, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

export type DashboardNavLink = {
  href: string;
  label: string;
};

export type DashboardUser = {
  name: string | null;
  email: string | null;
  role: string;
};

export function DashboardShell({
  user,
  nav,
  children,
}: {
  user: DashboardUser;
  nav: DashboardNavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MAGAS home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flame aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-bold tracking-tight">MAGAS</span>
            <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground sm:inline">
              {user.role}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Dashboard sections"
        className="border-b bg-background"
      >
        <div className="container flex gap-1 overflow-x-auto">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1">
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
