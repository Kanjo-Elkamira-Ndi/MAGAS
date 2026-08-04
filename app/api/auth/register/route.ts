import { errorResponse, ErrorCodes } from "@/types/api";

// Phase 0 stub — registration lands in Phase 1 per development-roadmap.md.
// Kept here so the route exists per context/file-structure.md and so the
// login page's "Register" link has somewhere to point.
export async function POST() {
  return errorResponse(
    ErrorCodes.NOT_IMPLEMENTED,
    "Registration ships in Phase 1. For now, seed users directly in Postgres.",
    501,
  );
}
