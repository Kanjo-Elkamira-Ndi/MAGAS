// Standard "night mode" Google Maps style — MAGAS is dark-first by default
// (components/theme-provider.tsx), and the stock light basemap looks out
// of place embedded in a dark card. Swapped in by delivery-map.tsx based
// on the active theme.
export const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2129" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2129" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8f98" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c7cad1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8f98" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263021" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2b2f38" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1d2129" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8f98" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3f4a" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2b2f38" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#141821" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a5f6a" }],
  },
];
