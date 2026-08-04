import { Flame, MapPin, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/shared/public-nav";
import { Reveal } from "@/components/shared/reveal";
import { AmbientBackground } from "@/components/shared/ambient-background";
import { Footer } from "@/components/shared/footer";

const values = [
  {
    icon: MapPin,
    title: "Local first",
    description:
      "We connect households to the gas retailers already serving their neighbourhoods — no middlemen, just more orders.",
  },
  {
    icon: ShieldCheck,
    title: "Safety never ships later",
    description:
      "Inspection and handling rules are core to every order, not an afterthought bolted on in a later phase.",
  },
  {
    icon: Truck,
    title: "Delivered with care",
    description:
      "Every cylinder is carried and delivered by a trained agent who follows the same safety playbook.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <AmbientBackground />
          <div className="container relative py-20 text-center md:py-28">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Flame aria-hidden="true" className="size-3.5 text-primary" />
                About MAGAS
              </span>
              <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Running out of gas at the worst moment shouldn&apos;t be a
                normal part of life.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                MAGAS exists to make household gas as easy to order as a meal.
                We started with one question: why should a family plan their
                cooking around a trip to the gas depot? We built the answer —
                a marketplace that brings local retailers to your phone and a
                trained agent to your door.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="border-t bg-muted/40 py-20 md:py-28">
          <div className="container">
            <Reveal>
              <div className="mx-auto max-w-xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  What we stand for
                </h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {values.map((value, i) => (
                <Reveal key={value.title} delay={i * 100}>
                  <div className="h-full rounded-xl border bg-card p-7">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <value.icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
                <div className="animate-aurora absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-[90px]" />
                <div className="relative px-8 py-14 text-center sm:px-14 sm:py-20">
                  <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-balance">
                    Join us in making gas simple
                  </h2>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    >
                      <Link href="/register">Create an account</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-primary-foreground/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                    >
                      <Link href="/#retailers">Partner as a retailer</Link>
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
