"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAgentLocationAction } from "@/lib/actions/agent";
import type { OrderStatus } from "@/types/db";

// Explicit opt-in on purpose: auto-starting navigator.geolocation the
// instant an order flips to out_for_delivery would fire an unprompted
// browser permission dialog right when the agent is trying to update
// status. The agent clicks "Share my location" themselves.
export function AgentLocationSharing({ status }: { status: OrderStatus }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Stop sharing if the order moves past out_for_delivery (delivered /
    // failed) — nothing left to track, and cleans up on unmount either way.
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "out_for_delivery" && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setSharing(false);
    }
  }, [status]);

  function start() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device or browser.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        updateAgentLocationAction({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }).catch(() => {
          // Best-effort — a single failed update tick isn't worth surfacing.
        });
      },
      () => {
        setError("Location sharing is off — the customer won't see your live position.");
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    watchIdRef.current = id;
    setSharing(true);
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }

  if (status !== "out_for_delivery") return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {sharing ? (
            <MapPin aria-hidden="true" className="size-4 text-success" />
          ) : (
            <MapPinOff aria-hidden="true" className="size-4 text-muted-foreground" />
          )}
          Location sharing: {sharing ? "on" : "off"}
        </div>
        <Button size="sm" variant={sharing ? "outline" : "default"} onClick={sharing ? stop : start}>
          {sharing ? "Stop sharing" : "Share my location"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {sharing
          ? "The customer can see your live position on the map."
          : "Turn this on so the customer can see your live position."}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
