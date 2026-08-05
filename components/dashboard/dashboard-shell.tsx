"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Flame,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { InitialAvatar } from "@/components/dashboard/avatar";
import { NavSearch, type NavSearchScope } from "@/components/dashboard/nav-search";
import { badgeSections, roleNav, type DashboardSection } from "@/components/dashboard/navigation";
import { cn } from "@/lib/utils";

export type DashboardUser = {
  name: string | null;
  email: string | null;
  role: string;
};

export function DashboardShell({
  user,
  badges,
  search,
  alerts,
  children,
}: {
  user: DashboardUser;
  badges?: Record<string, number>;
  search?: { scope: NavSearchScope };
  alerts?: { count: number; href: string; label: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = badgeSections(roleNav(user.role), badges ?? {});

  const activeLabel =
    sections
      .flatMap((s) => s.items)
      .find((item) => isItemActive(pathname, item.href))?.label ??
    user.role;

  const settingsHref =
    user.role === "admin"
      ? "/admin"
      : user.role === "retailer"
        ? "/retailer/settings"
        : user.role === "customer"
          ? "/customer/settings"
          : "/agent";

  return (
    <div className="flex min-h-svh bg-muted/30">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-background transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center px-2" : "gap-2.5 px-4",
          )}
        >
          <Link href="/" aria-label="MAGAS home" className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flame aria-hidden="true" className="size-4" strokeWidth={2.25} />
            </span>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight">MAGAS</span>
            )}
          </Link>
          {!collapsed && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
              {user.role}
            </span>
          )}
        </div>

        <SidebarNav
          sections={sections}
          collapsed={collapsed}
          pathname={pathname}
        />

        <div className={cn("shrink-0 border-t p-3", collapsed && "flex flex-col items-center gap-1")}>
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-2", collapsed ? "size-9 px-0" : "flex-1 justify-start")}
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut aria-hidden="true" className="size-4" />
              {!collapsed && <span>Sign out</span>}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "mt-1 w-full gap-2",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
            {!collapsed && <span>Collapse sidebar</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-4 z-40 size-11 rounded-full border bg-background shadow-lg lg:hidden"
            aria-label="Open dashboard menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame aria-hidden="true" className="size-4" strokeWidth={2.25} />
              </span>
              <span className="text-lg font-bold tracking-tight">MAGAS</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                {user.role}
              </span>
            </div>
            <SidebarNav
              sections={sections}
              collapsed={false}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="flex shrink-0 items-center gap-1 border-t p-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
          <div className="hidden items-center gap-1.5 text-sm sm:flex">
            <span className="text-muted-foreground capitalize">{user.role}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{activeLabel}</span>
          </div>
          <span className="text-sm font-semibold sm:hidden">{activeLabel}</span>

          <div className="ml-auto flex items-center gap-1.5">
            {search && (
              <div className="hidden md:block">
                <NavSearch scope={search.scope} />
              </div>
            )}
            {alerts && alerts.count > 0 && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label={alerts.label}
                className="relative"
              >
                <Link href={alerts.href}>
                  <Bell aria-hidden="true" className="size-5" />
                  <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                    {alerts.count > 9 ? "9+" : alerts.count}
                  </span>
                </Link>
              </Button>
            )}
            <div className="lg:hidden">
              <ThemeToggle />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <InitialAvatar name={user.name} email={user.email} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {user.name ?? user.email ?? "Signed in"}
                  </span>
                  <span className="text-xs font-normal capitalize text-muted-foreground">
                    {user.role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <Settings aria-hidden="true" className="size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function isItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  // Multi-segment hrefs (e.g. /customer/orders) match their subtree too.
  const segments = href.split("/").filter(Boolean).length;
  return segments > 1 && pathname.startsWith(href + "/");
}

function SidebarNav({
  sections,
  collapsed,
  pathname,
  onNavigate,
}: {
  sections: DashboardSection[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      aria-label="Dashboard sections"
      className="flex-1 overflow-y-auto px-3 py-4"
    >
      {sections.map((section) => (
        <div key={section.title} className="mb-1">
          {collapsed ? (
            <div className="mx-auto my-3 h-px w-6 bg-border" aria-hidden="true" />
          ) : (
            <p className="px-3 pb-1.5 pt-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase first:pt-0">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 items-center rounded-md text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "gap-3 px-3",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge ? (
                      <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                    {collapsed && (
                      <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
