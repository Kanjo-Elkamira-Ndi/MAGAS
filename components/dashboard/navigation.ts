import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

// Actor-specific sidebar navigation, defined once per role and rendered by
// DashboardShell. Badges are filled in by the layouts (they have DB access);
// the shell stays a pure renderer.

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type DashboardSection = {
  title: string;
  items: DashboardNavItem[];
};

// Returns a copy of the nav with per-href badge counts filled in. The
// layouts own the DB reads; the shell just renders what it's given.
export function badgeSections(
  sections: DashboardSection[],
  badges: Record<string, number>,
): DashboardSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      badges[item.href] ? { ...item, badge: badges[item.href] } : item,
    ),
  }));
}

const GENERAL: DashboardSection = {
  title: "General",
  items: [{ href: "/customer", label: "Overview", icon: LayoutDashboard }],
};

const CUSTOMER_ACCOUNT: DashboardSection = {
  title: "Account",
  items: [
    { href: "/customer/orders", label: "My orders", icon: Package },
    { href: "/customer/retailers", label: "Browse retailers", icon: Store },
    { href: "/customer/addresses", label: "Addresses", icon: MapPin },
    { href: "/customer/settings", label: "Settings", icon: Settings },
  ],
};

export const CUSTOMER_NAV: DashboardSection[] = [
  GENERAL,
  { title: "Shopping", items: CUSTOMER_ACCOUNT.items },
];

export const RETAILER_NAV: DashboardSection[] = [
  {
    title: "Manage",
    items: [
      { href: "/retailer", label: "Overview", icon: LayoutDashboard },
      { href: "/retailer/orders", label: "Orders", icon: ClipboardList },
      { href: "/retailer/products", label: "Products", icon: Package },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/retailer/earnings", label: "Earnings", icon: Wallet },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/retailer/settings", label: "Shop settings", icon: Settings }],
  },
];

export const ADMIN_NAV: DashboardSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: Home }],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/retailers", label: "Retailers", icon: Store },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/agents", label: "Delivery agents", icon: Truck },
    ],
  },
  {
    title: "Money",
    items: [{ href: "/admin/payments", label: "Payments", icon: CreditCard }],
  },
];

export const AGENT_NAV: DashboardSection[] = [
  {
    title: "General",
    items: [{ href: "/agent", label: "Overview", icon: Home }],
  },
  {
    title: "Deliveries",
    items: [{ href: "/agent/orders", label: "Orders", icon: Truck }],
  },
];

// Icons are component references and cannot cross the server->client prop
// boundary, so the shell resolves the role's nav on the client instead of
// receiving pre-built sections from a layout.
export function roleNav(role: string): DashboardSection[] {
  switch (role) {
    case "retailer":
      return RETAILER_NAV;
    case "admin":
      return ADMIN_NAV;
    case "agent":
      return AGENT_NAV;
    default:
      return CUSTOMER_NAV;
  }
}
