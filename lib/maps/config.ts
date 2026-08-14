// Shared config for every Google Maps JS SDK consumer (delivery-map.tsx,
// place-autocomplete-input.tsx). The libraries array must be a stable
// reference — @react-google-maps/api reloads the script if a new array
// instance is passed on every render — so it lives at module scope, not
// inline at each call site.
export const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}
