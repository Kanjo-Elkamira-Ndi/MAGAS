import type { Metadata } from "next";
import { MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireRole } from "@/lib/auth/session";
import { getRetailerProfile } from "@/lib/db/queries/retailers";

export const metadata: Metadata = { title: "Shop settings — MAGAS retailer" };

const STATUS_STYLE: Record<string, string> = {
  pending: "border-transparent bg-warning text-warning-foreground",
  approved: "border-transparent bg-success text-success-foreground",
  suspended: "border-transparent bg-destructive text-destructive-foreground",
};

export default async function RetailerSettingsPage() {
  const session = await requireRole("retailer");
  const retailerId = session.user.retailerId ?? "";
  const profile = await getRetailerProfile(retailerId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shop settings"
        description="Your shop profile. Business details can be edited once onboarding is rebuilt in a later phase."
      />

      {profile && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">{profile.business_name}</h2>
              <Badge variant="outline" className={STATUS_STYLE[profile.status] ?? ""}>
                {profile.status}
              </Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              {profile.location}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {profile.products} listed product{profile.products === 1 ? "" : "s"}
          </div>
        </div>
      )}

      <div className="max-w-xl rounded-xl border bg-card">
        <dl className="divide-y">
          <div className="flex items-center gap-3 px-5 py-4">
            <Store aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Business name</dt>
            <dd className="text-sm font-medium">{profile?.business_name ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Location</dt>
            <dd className="text-sm font-medium">{profile?.location ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <dt className="w-28 text-sm text-muted-foreground">Owner phone</dt>
            <dd className="text-sm font-medium">{profile?.owner_phone ?? "—"}</dd>
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <dt className="w-28 text-sm text-muted-foreground">Owner email</dt>
            <dd className="text-sm font-medium">{profile?.owner_email ?? "—"}</dd>
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
