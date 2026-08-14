"use client";

import { useState } from "react";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { GOOGLE_MAPS_LIBRARIES, getGoogleMapsApiKey } from "@/lib/maps/config";

/**
 * A text input backed by Google Places Autocomplete when a Maps API key is
 * configured, degrading to a plain input otherwise — address entry must
 * never be blocked on Maps being set up. On `place_changed`, reports the
 * selected place's formatted address and coordinates via `onPlaceSelect`;
 * typing without picking a suggestion still updates `value` via `onChange`
 * (submits fine, just without coordinates).
 */
export function PlaceAutocompleteInput({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(
    null,
  );

  function onPlaceChanged() {
    const place = autocomplete?.getPlace();
    const location = place?.geometry?.location;
    if (!location) return;
    onPlaceSelect({
      address: place?.formatted_address ?? value,
      lat: location.lat(),
      lng: location.lng(),
    });
  }

  const input = (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete="off"
    />
  );

  if (!apiKey || !isLoaded) return input;

  return (
    <Autocomplete
      onLoad={setAutocomplete}
      onPlaceChanged={onPlaceChanged}
      options={{ componentRestrictions: { country: "cm" } }}
    >
      {input}
    </Autocomplete>
  );
}
