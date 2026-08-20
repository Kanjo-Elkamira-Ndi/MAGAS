import * as notchpay from "./notchpay";
import * as fapshi from "./fapshi";
import { simulateCharge } from "./simulate";
import {
  ProviderUnavailableError,
  type ChargeInitiationInput,
  type ChargeInitiationResult,
} from "./types";

// Primary + fallback orchestrator: tries NotchPay first, falls through to
// Fapshi only when NotchPay is *unavailable* (ProviderUnavailableError —
// network/timeout/5xx/auth failure, or a missing credential, which both
// provider clients now also treat as "unavailable" rather than crashing),
// never on a clean decline (a decline is a real, final result from that
// provider, not a reason to try the other one). Pure orchestration, no DB
// access — keeps it easy to reason about and the natural place for a unit
// test if this repo ever adds a test runner (it currently has none).
export async function chargeOrder(
  input: ChargeInitiationInput,
): Promise<ChargeInitiationResult> {
  // Explicit opt-in dev convenience — lets the checkout flow be exercised
  // before sandbox credentials are provisioned for either provider. Never
  // set in production; loudly logged so it's never mistaken for a real
  // charge.
  if (process.env.PAYMENTS_MODE === "simulate") {
    console.warn(
      `[payments] PAYMENTS_MODE=simulate — order ${input.orderId} is using the fake processor, no real charge was attempted.`,
    );
    return simulateCharge(input);
  }

  try {
    return await notchpay.initiateCharge(input);
  } catch (err) {
    if (!(err instanceof ProviderUnavailableError)) throw err;
  }

  try {
    return await fapshi.initiateCharge(input);
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      return {
        kind: "failed",
        provider: "fapshi",
        message: "Both payment providers are currently unavailable. Please try again shortly.",
      };
    }
    throw err;
  }
}
