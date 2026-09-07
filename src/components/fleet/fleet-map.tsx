import { Suspense, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapVehicle } from "./fleet-map-impl";

// The Leaflet implementation uses the browser's `window` object and must only be loaded on the client.
// We dynamically import it after the component mounts, ensuring the SSR bundle never evaluates Leaflet code.
export type { MapVehicle };

export function FleetMap(props: {
  vehicles: MapVehicle[];
  geofence: { lat: number; lng: number; radiusKm: number; name: string };
  onSelect?: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [MapImpl, setMapImpl] = useState<React.ComponentType<any> | null>(null);

  // Mark that we are on the client
  useEffect(() => {
    setMounted(true);
    // Dynamically import the Leaflet implementation only in the browser
    import("./fleet-map-impl").then((mod) => setMapImpl(() => mod.default));
  }, []);

  if (!mounted || !MapImpl) {
    // Show a skeleton while the map component loads on the client
    return <Skeleton className="h-full w-full bg-muted/50" />;
  }

  return (
    <Suspense fallback={<Skeleton className="h-full w-full bg-muted/50" />}>
      <MapImpl {...props} />
    </Suspense>
  );
}
