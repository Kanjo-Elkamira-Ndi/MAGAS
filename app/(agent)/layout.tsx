import { redirect } from "next/navigation";

// The delivery agent portal is intentionally dormant per context/security.md.
// No user with role 'agent' can be created yet, and even if one existed this
// guard denies unconditionally — the layout never renders real agent UI.
export default function AgentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  void children;
  redirect("/login?error=agent-not-available");
}
