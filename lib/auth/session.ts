import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./nextauth-config";
import type { UserRole } from "@/types/db";

export async function getSession() {
  return getServerSession(authOptions);
}

// Page-level RBAC guard complementing middleware.ts (defense-in-depth per
// context/security.md). Each protected route-group layout calls this with
// its allowed role(s); wrong/absent role redirects to /login.
export async function requireRole(...roles: UserRole[]) {
  const session = await getSession();
  const role = session?.user?.role;
  if (!session || !role || !roles.includes(role)) {
    redirect("/login");
  }
  return session;
}
