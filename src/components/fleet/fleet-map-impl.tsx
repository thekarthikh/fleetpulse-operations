"use client";
import React, { useEffect, useState } from "react";
import type { VehicleStatus } from "@/lib/fleet/types";

export interface MapVehicle {
  id: string;
  plate: string;
  status: VehicleStatus;
  speedKph: number;
  fuelLevelPct: number;
  lat: number;
  lng: number;
  driverName: string;
  healthScore: number;
}

const COLORS: Record<VehicleStatus, string> = {
  MOVING: "#3ddc97",
  IDLE: "#f2b544",
  PARKED: "#8b95a5",
  MAINTENANCE: "#6aa6ff",
  OFFLINE: "#8b95a5",
};

// Export a placeholder when building for SSR to avoid bundling react-leaflet/leaflet.
const FleetMapImpl = typeof window === "undefined"
  ? () => null
  : function FleetMapImpl({
      vehicles,
      geofence,
      onSelect,
    }: {
      vehicles: MapVehicle[];
      geofence: { lat: number; lng: number; radiusKm: number; name: string };
      onSelect?: (id: string) => void;
    }) {
    const [Leaflet, setLeaflet] = useState<null | {
      MapContainer: React.ComponentType<any>;
      TileLayer: React.ComponentType<any>;
      Circle: React.ComponentType<any>;
      CircleMarker: React.ComponentType<any>;
      Popup: React.ComponentType<any>;
    }>(null);

    useEffect(() => {
      // Load react-leaflet and its peer leaflet on client only
      import("react-leaflet").then((mod) => {
        setLeaflet({
          MapContainer: mod.MapContainer,
          TileLayer: mod.TileLayer,
          Circle: mod.Circle,
          CircleMarker: mod.CircleMarker,
          Popup: mod.Popup,
        });
      });
    }, []);

    if (!Leaflet) return null;

    const { MapContainer, TileLayer, Circle, CircleMarker, Popup } = Leaflet;

    return (
      <MapContainer
        center={[geofence.lat, geofence.lng]}
        zoom={9}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[geofence.lat, geofence.lng]}
          radius={geofence.radiusKm * 1000}
          pathOptions={{ color: "#4fd1e0", weight: 1, fillOpacity: 0.04, dashArray: "6 6" }}
        />
        {vehicles.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={v.status === "MOVING" ? 7 : 5}
            pathOptions={{
              color: COLORS[v.status],
              fillColor: COLORS[v.status],
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelect?.(v.id) }}
          >
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                <strong>{v.plate}</strong> · {v.status}
                <br />
                {v.driverName}
                <br />
                {v.speedKph.toFixed(0)} km/h · fuel {v.fuelLevelPct.toFixed(0)}% · health {v.healthScore}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    );
  };

export default FleetMapImpl;
