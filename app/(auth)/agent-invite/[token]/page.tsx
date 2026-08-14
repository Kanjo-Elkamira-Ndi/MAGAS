import { AuthShell } from "@/components/shared/auth-shell";
import { AgentInviteForm } from "./invite-form";
import { findValidVerificationToken } from "@/lib/db/queries/verification-tokens";
import { getUserById } from "@/lib/db/queries/users";

// Public page an invited delivery agent lands on to set their own
// password and activate the login an admin linked from /admin/agents.
// No requireRole() here on purpose — the visitor has no session yet.
export default async function AgentInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenRow = await findValidVerificationToken(token, "agent_invite");
  const user = tokenRow?.user_id ? await getUserById(tokenRow.user_id) : null;
  const identifier = user?.email ?? user?.phone ?? null;

  return (
    <AuthShell
      eyebrow="Delivery agent"
      title="Set up your delivery account"
      subtitle="Your admin invited you to MAGAS as a delivery agent. Set a password to start seeing your assigned deliveries."
      highlights={[
        {
          title: "See what's assigned to you",
          description: "Active deliveries and their drop-off details, in one place.",
        },
        {
          title: "Update status yourself",
          description: "Mark a delivery out for delivery, delivered, or failed as you go.",
        },
      ]}
    >
      {!identifier ? (
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            This invite link isn&apos;t valid
          </h2>
          <p className="text-sm text-muted-foreground">
            It may have expired or already been used. Ask your admin to send a
            new invite from Delivery agents in the admin dashboard.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Set your password</h2>
            <p className="text-sm text-muted-foreground">
              Activating login for {identifier}.
            </p>
          </div>
          <AgentInviteForm token={token} identifier={identifier} />
        </div>
      )}
    </AuthShell>
  );
}
