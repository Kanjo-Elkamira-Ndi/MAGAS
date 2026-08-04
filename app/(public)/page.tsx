import {
  ArrowRight,
  Banknote,
  Flame,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmbientBackground } from "@/components/shared/ambient-background";
import { HeroCarousel } from "@/components/shared/hero-carousel";
import { PublicNav } from "@/components/shared/public-nav";
import { Reveal } from "@/components/shared/reveal";
import { Footer } from "@/components/shared/footer";

const stats = [
  { value: "5 min", label: "average order time" },
  { value: "100%", label: "tracked deliveries" },
  { value: "3", label: "payment options" },
];

const steps = [
  {
    icon: MapPin,
    title: "Choose your area",
    description:
      "Enter your neighbourhood and see verified gas retailers near you with live cylinder prices in FCFA.",
  },
  {
    icon: Flame,
    title: "Pick your cylinder",
    description:
      "Choose size and quantity, then pay by Cash on Delivery, MTN MoMo, or Orange Money — whichever you prefer.",
  },
  {
    icon: Truck,
    title: "Get it delivered",
    description:
      "A trained delivery agent brings your cylinder to your door. Track every step from placed to delivered.",
  },
];

const retailerPoints = [
  {
    icon: Banknote,
    title: "Reach more customers",
    description: "Get orders from your whole neighbourhood, not just walk-ins.",
  },
  {
    icon: Users,
    title: "Run on your terms",
    description: "Set your own prices, hours, and delivery radius.",
  },
  {
    icon: Phone,
    title: "One dashboard",
    description: "Confirm orders, track agents, and manage payments in one place.",
  },
];

const safetyPoints = [
  "Cylinders are inspected before every dispatch",
  "Delivery agents complete handling training",
  "Cash on Delivery, MoMo, and Orange Money — no handling risks",
  "Order history and retailer records kept for every transaction",
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        {/* Hero — split screen: copy left, carousel right, ambient bg behind */}
        <section className="relative overflow-hidden">
          <AmbientBackground />
          <div className="container relative grid items-center gap-14 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
            <div className="max-w-xl">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Now delivering across Douala &amp; Yaoundé
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Household gas,
                  <br />
                  delivered to your{" "}
                  <span className="text-primary">door.</span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                  Order cylinders from local Cameroonian retailers, pay the way
                  you want, and follow your delivery in real time.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/register">
                      Order a cylinder
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/#retailers">I&apos;m a retailer</Link>
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <dl className="mt-12 grid grid-cols-3 gap-6 border-t pt-8">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="order-2 mt-1 text-xs text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd className="text-2xl font-bold tracking-tight text-primary">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={200} className="lg:justify-self-end">
              <HeroCarousel className="w-full max-w-md lg:max-w-none" />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t bg-muted/40 py-20 md:py-28">
          <div className="container">
            <Reveal>
              <div className="mx-auto max-w-xl text-center">
                <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  How it works
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  From doorstep to door, in three steps
                </h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 100}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                          <step.icon aria-hidden="true" className="size-5" />
                        </span>
                        <span className="text-sm font-semibold text-muted-foreground">
                          Step {i + 1}
                        </span>
                      </div>
                      <CardTitle className="mt-4">{step.title}</CardTitle>
                      <CardDescription className="leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Retailers */}
        <section id="retailers" className="py-20 md:py-28">
          <div className="container grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div>
                <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  For retailers
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Your neighbourhood is already ordering. Take the orders.
                </h2>
                <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                  MAGAS connects your shop to every household nearby. You set
                  the price, we bring the orders.
                </p>
                <div className="mt-8 space-y-5">
                  {retailerPoints.map((point) => (
                    <div key={point.title} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <point.icon aria-hidden="true" className="size-4.5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{point.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="mt-10">
                  <Link href="/register">Join as a retailer</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="relative overflow-hidden rounded-3xl border bg-muted/40 p-8 sm:p-10">
                <div className="animate-aurora absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Flame aria-hidden="true" className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">12.5 kg cylinder</p>
                        <p className="text-xs text-muted-foreground">
                          Bonapriso, Douala
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      7 500 FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Truck aria-hidden="true" className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          Arrives in ~45 min
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      On its way
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Banknote aria-hidden="true" className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">MTN MoMo</p>
                        <p className="text-xs text-muted-foreground">
                          Paid on delivery
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-success">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Safety */}
        <section
          id="safety"
          className="border-t bg-muted/40 py-20 md:py-28"
        >
          <div className="container grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border bg-card p-8 sm:p-10">
                <div className="animate-aurora absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
                <div className="relative flex h-full flex-col">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <ShieldCheck aria-hidden="true" className="size-6" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold tracking-tight">
                    Safe from the shop to your kitchen
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    Handling LPG is serious business. That&apos;s why every
                    order on MAGAS follows the same safety playbook.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div>
                <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  Safety first
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Every cylinder, checked twice
                </h2>
                <ul className="mt-8 space-y-4">
                  {safetyPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA band */}
        <section className="py-20 md:py-28">
          <div className="container">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
                <div className="animate-aurora absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-[90px]" />
                <div className="relative px-8 py-14 text-center sm:px-14 sm:py-20">
                  <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                    Your kitchen shouldn&apos;t run out of gas
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-primary-foreground/85">
                    Create an account and order your next cylinder in under five
                    minutes.
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    >
                      <Link href="/register">
                        Create an account
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-primary-foreground/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                    >
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
