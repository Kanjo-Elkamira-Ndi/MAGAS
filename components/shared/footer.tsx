import { Flame } from "lucide-react";
import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/register", label: "Order gas" },
      { href: "/#retailers", label: "For retailers" },
    ],
  },
  {
    title: "Safety",
    links: [
      { href: "/#safety", label: "Handling guidelines" },
      { href: "/about", label: "Our mission" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/about", label: "About" },
      { href: "/login", label: "Customer login" },
      { href: "/login", label: "Retailer login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame aria-hidden="true" className="size-5" strokeWidth={2.25} />
              </span>
              <span className="text-lg font-bold tracking-tight">MAGAS</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Household gas cylinder delivery across Cameroon. Order from local
              retailers and track your delivery — safely, simply, fast.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} MAGAS. All rights reserved.
          </p>
          <p>Made in Cameroon 🇨🇲</p>
        </div>
      </div>
    </footer>
  );
}
