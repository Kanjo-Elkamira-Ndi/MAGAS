import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // withAuth's `authorized` callback below does the actual decision.
    // This function only exists to satisfy the type signature.
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized({ token, req }) {
        const path = req.nextUrl.pathname;

        // Public + auth route groups: always accessible.
        if (
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/forgot-password") ||
          path.startsWith("/reset-password") ||
          path.startsWith("/agent-invite") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/public")
        ) {
          return true;
        }

        // Agent API: UNCONDITIONALLY denied. The agent portal itself ships
        // as Server Actions (lib/actions/agent.ts), same as every other
        // role's mutations — this REST surface stays intentionally dead so
        // it isn't a second, unreviewed way in.
        if (path.startsWith("/api/agent")) {
          return false;
        }

        // Payment provider webhooks: intentionally left out of both the
        // allowlist above and the role-gated map below, so they fall
        // through to the final `return true` — deliberately public, since
        // NotchPay/Fapshi have no session/role to present. Each handler
        // (app/api/payments/notchpay|fapshi/route.ts) verifies the
        // provider's signature itself instead. Do not "fix" this by
        // adding auth here — that would break both webhooks.

        // Role-gated page routes (parenthesized route groups flatten in URLs).
        const pageRole: Record<string, string> = {
          "/customer": "customer",
          "/retailer": "retailer",
          "/admin": "admin",
          "/agent": "agent",
        };

        for (const [prefix, allowed] of Object.entries(pageRole)) {
          if (path.startsWith(prefix)) {
            return token?.role === allowed;
          }
        }

        // Role-gated API routes (defense-in-depth; route handlers re-check).
        const apiRole: Record<string, string> = {
          "/api/customer": "customer",
          "/api/retailer": "retailer",
          "/api/admin": "admin",
        };

        for (const [prefix, allowed] of Object.entries(apiRole)) {
          if (path.startsWith(prefix)) {
            return token?.role === allowed;
          }
        }

        // Everything else (e.g. public marketing routes) is allowed.
        return true;
      },
    },
  },
);

export const config = {
  // Run middleware on every routed path except Next internals & static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
