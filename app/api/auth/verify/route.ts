import { errorResponse, ErrorCodes } from "@/types/api";

export async function POST() {
  return errorResponse(
    ErrorCodes.NOT_IMPLEMENTED,
    "Email/phone verification ships in Phase 1.",
    501,
  );
}
