import { errorResponse, ErrorCodes } from "@/types/api";

// Agent portal routes are deliberately dormant per context/security.md.
// These stubs return 501 regardless of any other condition — the schema
// and routes exist so the feature can ship without a migration later.

export async function GET() {
  return errorResponse(
    ErrorCodes.AGENT_PORTAL_NOT_AVAILABLE,
    "The delivery agent portal is not yet available. See context/security.md.",
    501,
  );
}

export async function POST() {
  return errorResponse(
    ErrorCodes.AGENT_PORTAL_NOT_AVAILABLE,
    "The delivery agent portal is not yet available. See context/security.md.",
    501,
  );
}
