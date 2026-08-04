import type { RetailerRow } from "@/types/db";

// Phase 0 stub — real query functions land in Phase 1+.
// Kept here so import paths resolve across route handlers during
// scaffolding.

export async function getRetailerByUserId(
  _userId: string,
): Promise<RetailerRow | null> {
  throw new Error("getRetailerByUserId not implemented until Phase 1.");
}
