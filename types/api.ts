import { z } from "zod";

// Standard API response envelopes used across all route handlers.
export type SuccessEnvelope<TData> = {
  success: true;
  data: TData;
};

export type ErrorEnvelope = {
  success: false;
  error: {
    code: string; // SCREAMING_SNAKE_CASE per code-standards.md
    message: string;
  };
};

export type ApiResponse<TData> = SuccessEnvelope<TData> | ErrorEnvelope;

// Shared error codes (kept here so route handlers don't invent duplicates).
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  AGENT_PORTAL_NOT_AVAILABLE: "AGENT_PORTAL_NOT_AVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export const seedErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export function successResponse<TData>(
  data: TData,
  init?: ResponseInit,
): Response {
  return Response.json(
    { success: true, data } satisfies SuccessEnvelope<TData>,
    { status: 200, ...init },
  );
}

export function errorResponse(
  code: (typeof ErrorCodes)[keyof typeof ErrorCodes] | string,
  message: string,
  status = 400,
): Response {
  return Response.json(
    { success: false, error: { code, message } } satisfies ErrorEnvelope,
    { status },
  );
}
