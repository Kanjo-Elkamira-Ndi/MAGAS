"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { getAgentLocationAction } from "@/lib/actions/tracking";
import { GOOGLE_MAPS_LIBRARIES, getGoogleMapsApiKey } from "@/lib/maps/config";
import { darkMapStyle } from "@/lib/maps/dark-style";

const POLL_INTERVAL_MS = 15_000;
const MAP_CONTAINER_STYLE = { width: "100%", height: "260px" };

type LatLng = { lat: number; lng: number };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Live tracking</h2>
      {children}
    </div>
  );
}

export function DeliveryMap({
  orderId,
  destination,
}: {
  orderId: string;
  destination: LatLng | null;
}) {
  const { theme } = useTheme();
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [agentPosition, setAgentPosition] = useState<LatLng | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const location = await getAgentLocationAction(orderId);
        if (cancelled) return;
        if (location) {
          setAgentPosition({ lat: location.latitude, lng: location.longitude });
          setLastUpdated(new Date(location.location_updated_at));
        }
      } catch {
        // A polling tick failing (e.g. transient network hiccup) shouldn't
        // clear an already-known position — just skip this tick.
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId]);

  const center = useMemo(
    () => agentPosition ?? destination ?? { lat: 4.0511, lng: 9.7679 }, // Douala fallback
    [agentPosition, destination],
  );

  if (!apiKey) {
    return (
      <Card>
        <p className="text-xs text-muted-foreground">
          Live tracking isn&apos;t configured on this deployment.
        </p>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
      </Card>
    );
  }

  return (
    <Card>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={agentPosition && destination ? 13 : 12}
        options={{
          styles: theme === "dark" ? darkMapStyle : undefined,
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        {agentPosition && (
          <Marker
            position={agentPosition}
            title="Delivery agent"
            icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          />
        )}
        {destination && (
          <Marker
            position={destination}
            title="Delivery address"
            icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
          />
        )}
      </GoogleMap>
      {!agentPosition ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5" />
          Waiting for the delivery agent&apos;s location…
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Agent position updated{" "}
          {lastUpdated?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {!destination && (
        <p className="text-xs text-muted-foreground">
          No destination pin on file for this order yet.
        </p>
      )}
    </Card>
  );
}
