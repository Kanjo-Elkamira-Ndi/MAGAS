"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlaceAutocompleteInput } from "@/components/shared/place-autocomplete-input";
import { updateRetailerLocationAction } from "@/lib/actions/dashboard";

// New form — the retailer settings page has no edit capability today
// (onboarding/profile editing is still a later phase), so this is scoped
// narrowly to just the delivery-location pin live tracking needs, not a
// general "edit shop profile" form.
export function RetailerLocationForm({
  location,
  hasCoordinates,
}: {
  location: string;
  hasCoordinates: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(location);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!coords) {
      setError("Pick a suggestion from the list so we have exact coordinates.");
      return;
    }
    startTransition(async () => {
      try {
        await updateRetailerLocationAction({
          location: value,
          latitude: coords.lat,
          longitude: coords.lng,
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save location.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex max-w-xl flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <div className="flex items-center gap-2">
        <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Delivery location</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasCoordinates
          ? "Used to place your shop on the customer's live tracking map."
          : "Not set yet — pick your shop's address below so customers can see it on the delivery map."}
      </p>
      <div>
        <Label htmlFor="retailer-location">Address</Label>
        <PlaceAutocompleteInput
          id="retailer-location"
          value={value}
          onChange={(v) => {
            setValue(v);
            setCoords(null);
          }}
          onPlaceSelect={({ address, lat, lng }) => {
            setValue(address);
            setCoords({ lat, lng });
          }}
          placeholder="Search for your shop's address…"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && !error && <p className="text-xs text-success">Location saved.</p>}
      <Button type="submit" size="sm" className="self-start" disabled={pending}>
        {pending ? "Saving…" : "Save location"}
      </Button>
    </form>
  );
}
