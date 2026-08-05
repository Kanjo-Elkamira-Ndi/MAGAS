import type { Metadata } from "next";
import { Mail, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { getCustomerProfile } from "@/lib/db/queries/users";

export const metadata: Metadata = { title: "Settings — MAGAS" };

export default async function CustomerSettingsPage() {
  const session = await requireRole("customer");
  const customerId = session.user.customerId ?? "";
  const profile = await getCustomerProfile(customerId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account settings"
        description="Your profile details and preferences. Password changes and notifications arrive in a later phase."
      />
      <div className="max-w-xl rounded-xl border bg-card">
        <dl className="divide-y">
          <div className="flex items-center gap-3 px-5 py-4">
            <User aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Full name</dt>
            <dd className="text-sm font-medium">{profile?.full_name ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Email</dt>
            <dd className="text-sm font-medium">{profile?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Phone</dt>
            <dd className="text-sm font-medium">{profile?.phone ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <dt className="w-28 text-sm text-muted-foreground">Member since</dt>
            <dd className="text-sm font-medium">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
