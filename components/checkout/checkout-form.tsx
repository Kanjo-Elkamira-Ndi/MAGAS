"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatFcfa } from "@/lib/format";
import { placeOrderAction } from "@/lib/actions/checkout";
import type { ProductListItem } from "@/lib/db/queries/products";
import type { AddressRow } from "@/types/db";
import type { PaymentMethod } from "@/lib/payments/types";

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cod", label: "Cash on delivery" },
  { value: "momo", label: "MTN MoMo" },
  { value: "orange", label: "Orange Money" },
];

export function CheckoutForm({
  retailerId,
  products,
  addresses,
  defaultAddressId,
}: {
  retailerId: string;
  products: ProductListItem[];
  addresses: AddressRow[];
  defaultAddressId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addressId, setAddressId] = useState(defaultAddressId ?? addresses[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [quantities],
  );

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0),
    [items, products],
  );

  function setQuantity(productId: string, quantity: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, quantity) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    if (!addressId) {
      setError("Choose a delivery address.");
      return;
    }
    if (paymentMethod !== "cod" && !phone.trim()) {
      setError("Enter the phone number to charge for MoMo/Orange Money.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await placeOrderAction({
          retailerId,
          addressId,
          items,
          paymentMethod,
          phone: paymentMethod === "cod" ? undefined : phone.trim(),
        });

        if (result.chargeResult?.kind === "redirect") {
          // Leaves MAGAS to complete payment on the provider's hosted
          // page; the provider redirects back to the order page after.
          window.location.href = result.chargeResult.redirectUrl;
          return;
        }

        router.push(`/customer/order/${result.orderId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not place your order.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Products</h2>
        {products.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Nothing in stock from this retailer right now.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {products.map((p) => {
              const qty = quantities[p.id] ?? 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.brand} · {p.cylinder_size}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFcfa(p.price)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={qty === 0}
                      onClick={() => setQuantity(p.id, qty - 1)}
                    >
                      <Minus aria-hidden="true" className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{qty}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQuantity(p.id, qty + 1)}
                    >
                      <Plus aria-hidden="true" className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold">{formatFcfa(total)}</span>
            </li>
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Delivery address</h2>
          {addresses.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              You have no saved addresses yet.{" "}
              <a href="/customer/addresses" className="font-medium underline underline-offset-2">
                Add one
              </a>{" "}
              before checking out.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors",
                    addressId === a.id ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      {a.label ?? "Address"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {a.line1}, {a.city}
                    </span>
                  </span>
                </label>
              ))}
              <a
                href="/customer/addresses"
                className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Manage addresses
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Payment method</h2>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  paymentMethod === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted/40",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {paymentMethod !== "cod" && (
            <div>
              <Label htmlFor="checkout-phone">Phone number to charge</Label>
              <Input
                id="checkout-phone"
                required
                placeholder="+237 6XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" disabled={pending || products.length === 0}>
          {pending ? "Placing order…" : `Place order — ${formatFcfa(total)}`}
        </Button>
      </aside>
    </form>
  );
}
