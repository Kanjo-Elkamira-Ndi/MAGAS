import { requireRole } from "@/lib/auth/session";

export default async function RetailerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("retailer");
  return <>{children}</>;
}
