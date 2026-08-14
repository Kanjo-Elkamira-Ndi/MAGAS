"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { PlaceAutocompleteInput } from "@/components/shared/place-autocomplete-input";
import {
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/lib/actions/dashboard";
import type { AddressRow } from "@/types/db";

const EMPTY_FORM = {
  label: "",
  line1: "",
  city: "",
  notes: "",
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
};

export function AddressManager({
  addresses,
  defaultAddressId,
}: {
  addresses: AddressRow[];
  defaultAddressId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<AddressRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addAddressAction(form);
        setForm(EMPTY_FORM);
        setShowForm(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save address.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-4 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <MapPin aria-hidden="true" className="size-5" />
          </span>
          <p className="text-sm font-semibold">No saved addresses</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Save your home or office so checking out is quicker.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {a.label ?? "Address"}
                  </p>
                  {a.id === defaultAddressId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <Star aria-hidden="true" className="size-3" />
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.line1}</p>
                <p className="text-xs text-muted-foreground">
                  {a.city}
                  {a.notes ? ` · ${a.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {a.id !== defaultAddressId && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await setDefaultAddressAction(a.id);
                        router.refresh();
                      })
                    }
                  >
                    Make default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-xl border bg-card p-5"
        >
          <p className="text-sm font-semibold">Add a new address</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="addr-label">Label (optional)</Label>
              <Input
                id="addr-label"
                placeholder="Home, Office…"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="addr-line1">Address line</Label>
              <PlaceAutocompleteInput
                id="addr-line1"
                required
                placeholder="12 Rue de la Paix"
                value={form.line1}
                onChange={(line1) => setForm({ ...form, line1 })}
                onPlaceSelect={({ address, lat, lng }) =>
                  setForm({ ...form, line1: address, latitude: lat, longitude: lng })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a suggestion to enable live map tracking for orders to this address.
              </p>
            </div>
            <div>
              <Label htmlFor="addr-city">City</Label>
              <Input
                id="addr-city"
                required
                placeholder="Douala"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="addr-notes">Notes (optional)</Label>
              <Textarea
                id="addr-notes"
                placeholder="Nearest landmark…"
                className="min-h-9 resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save address
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setShowForm(true)}>
          <Plus aria-hidden="true" className="size-4" />
          Add address
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this address?"
        description={deleting ? `${deleting.line1}, ${deleting.city} will be removed from your saved addresses.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            await deleteAddressAction(deleting.id);
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
