import { requireRole } from "@/lib/auth/session";

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("customer");
  return <>{children}</>;
}
