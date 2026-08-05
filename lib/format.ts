// Pure formatting helpers shared by server and client code. This module
// must stay free of any server-only imports (no db/pg) so client
// components can use it safely.

// Simple money formatter shared by dashboards (XAF has no subunit).
export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("en-US")} FCFA`;
}
