import { errorResponse, ErrorCodes } from "@/types/api";

export async function POST() {
  return errorResponse(
    ErrorCodes.NOT_IMPLEMENTED,
    "Password reset ships in Phase 1.",
    501,
  );
}
