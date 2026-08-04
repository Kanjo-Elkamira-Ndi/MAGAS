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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error?.message ?? "Unexpected response. Please try again.");
      setLoading(false);
      return;
    }

    setMessage("Account created — signing you in…");
    const result = await signIn("credentials", {
      identifier: email || phone,
      password,
      redirect: false,
    });
    if (result?.error) {
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Join MAGAS"
      title="Order gas in minutes, run a shop in one"
      subtitle="Create your account and start ordering from local retailers — or list your shop and take orders from your whole neighbourhood."
      highlights={[
        {
          title: "Compare local retailers",
          description: "Live cylinder prices in FCFA, nearest to you first.",
        },
        {
          title: "Pay your way",
          description: "Cash on Delivery, MTN MoMo, or Orange Money.",
        },
        {
          title: "Retailers welcome",
          description: "Join as a shop and manage orders from one dashboard.",
        },
      ]}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold tracking-tight">
            Create your account
          </h2>
          <p className="text-sm text-muted-foreground">
            Free to join. No card required.
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
            <Label htmlFor="name" className="text-sm">
              Full name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-sm">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XX XX XX"
              autoComplete="tel"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-success" role="status">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
