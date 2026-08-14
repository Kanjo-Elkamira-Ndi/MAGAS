import { errorResponse, ErrorCodes } from "@/types/api";

// The agent portal itself is live (see app/agent/*, lib/actions/agent.ts),
// but it ships entirely as Server Actions, like every other role's
// mutations — this REST surface stays deliberately dead rather than wired
// up, so it isn't a second, less-reviewed way to reach agent data.
// middleware.ts denies /api/agent/* unconditionally ahead of this handler.

export async function GET() {
  return errorResponse(
    ErrorCodes.AGENT_PORTAL_NOT_AVAILABLE,
    "This REST endpoint is not used — the agent portal runs on Server Actions.",
    501,
  );
}

export async function POST() {
  return errorResponse(
    ErrorCodes.AGENT_PORTAL_NOT_AVAILABLE,
    "This REST endpoint is not used — the agent portal runs on Server Actions.",
    501,
  );
}
