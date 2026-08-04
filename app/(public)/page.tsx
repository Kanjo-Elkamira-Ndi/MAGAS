import { Flame, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/shared/footer";

const features = [
  {
    icon: Flame,
    title: "Real retailers, real prices",
    description:
      "Compare gas retailers near you and see live cylinder prices before you order.",
  },
  {
    icon: MapPin,
    title: "Delivered to your door",
    description:
      "Set a delivery address and choose Cash on Delivery, MTN MoMo, or Orange Money.",
  },
  {
    icon: Truck,
    title: "Track every order",
    description:
      "Follow your order from placed to delivered with live status updates.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-lg font-bold tracking-tight">MAGAS</span>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
            Gas cylinders, delivered.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Order household gas cylinders from local Cameroonian retailers and
            track delivery right to your door.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Order a cylinder</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                I&apos;m a retailer
              </Button>
            </Link>
          </div>
        </section>

        <section className="container grid gap-4 pb-16 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-6 w-6 text-primary" />
                <CardTitle className="mt-2">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
