"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/shared/auth-shell";
import { SocialButtons } from "@/components/shared/social-buttons";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email/phone or password.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your gas, one sign-in away"
      subtitle="Order a cylinder, track a delivery, or run your shop — everything lives on your MAGAS account."
      highlights={[
        {
          title: "Order in under five minutes",
          description: "Pick your area, choose your cylinder, pay your way.",
        },
        {
          title: "Track every delivery",
          description: "Live status from placed to delivered.",
        },
        {
          title: "One account, every role",
          description: "Customer, retailer, and agent access in one place.",
        },
      ]}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            Use the email or phone you registered with.
          </p>
        </div>

        <SocialButtons />

        <div className="flex items-center gap-3">
          <span className="bg-border h-px flex-1" />
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            or with email
          </span>
          <span className="bg-border h-px flex-1" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier" className="text-sm">
              Email or phone
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +237 6XX XX XX XX"
              autoComplete="username"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
