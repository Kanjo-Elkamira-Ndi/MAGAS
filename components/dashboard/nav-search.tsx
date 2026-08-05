"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, Store, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Actor-scoped global search. Navigates to the relevant list page with a
// `?q=` query string; the page (a server component) applies the filter so
// there is no separate search API to maintain.

export type NavSearchScope = "products" | "orders" | "admin";

const ADMIN_TARGETS = [
  { value: "/admin/users", label: "Users", icon: Users },
  { value: "/admin/orders", label: "Orders", icon: Package },
  { value: "/admin/retailers", label: "Retailers", icon: Store },
];

export function NavSearch({ scope }: { scope: NavSearchScope }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(ADMIN_TARGETS[0].value);

  const placeholder =
    scope === "admin"
      ? "Search users, orders, retailers…"
      : scope === "products"
        ? "Search your products…"
        : "Search retailers & products…";

  const basePath =
    scope === "admin"
      ? target
      : scope === "products"
        ? "/retailer/products"
        : "/customer/retailers";

  function go() {
    const trimmed = query.trim();
    router.push(trimmed ? `${basePath}?q=${encodeURIComponent(trimmed)}` : basePath);
  }

  return (
    <div className="flex items-center gap-1">
      {scope === "admin" && (
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger
            aria-label="Search scope"
            className="h-9 w-[7.5rem] border-r-0 rounded-r-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_TARGETS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2">
                  <t.icon className="size-3.5" aria-hidden="true" />
                  {t.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 pl-9"
        />
      </div>
    </div>
  );
}
