import type { Driver, Geofence, MaintenanceRecord, ServiceHistoryEntry, Vehicle } from "./types";

/** Deterministic PRNG so every cold start produces the same fleet. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FLEET_SIZE = 25;

export const GEOFENCE: Geofence = {
  name: "Bay Area Operating Zone",
  centerLat: 37.7749,
  centerLng: -122.4194,
  radiusKm: 42,
};

const DEPOTS = [
  { name: "SFO North Depot", lat: 37.7749, lng: -122.4194 },
  { name: "Oakland Yard", lat: 37.8044, lng: -122.2712 },
  { name: "San Mateo Hub", lat: 37.5629, lng: -122.3255 },
];

const MODELS: { make: string; model: string; fuel: Vehicle["fuelType"] }[] = [
  { make: "Freightliner", model: "eCascadia", fuel: "ELECTRIC" },
  { make: "Volvo", model: "FH16", fuel: "DIESEL" },
  { make: "Ford", model: "F-150 Lightning", fuel: "ELECTRIC" },
  { make: "Mercedes", model: "Sprinter 2500", fuel: "DIESEL" },
  { make: "Toyota", model: "Hilux Hybrid", fuel: "HYBRID" },
  { make: "Isuzu", model: "NPR-HD", fuel: "DIESEL" },
  { make: "Rivian", model: "EDV 700", fuel: "ELECTRIC" },
  { make: "Chevrolet", model: "Silverado 3500", fuel: "PETROL" },
];

const FIRST = [
  "Marcus","Priya","Diego","Aisha","Tomas","Lena","Omar","Grace","Nikhil","Sofia",
  "Ethan","Yuki","Malik","Clara","Andre","Hana","Victor","Nadia","Sam","Ivy",
  "Jonas","Rosa","Kwame","Elena","Theo",
];
const LAST = [
  "Alvarez","Nakamura","Okafor","Petrov","Ramirez","Sullivan","Haddad","Fischer","Mensah","Rossi",
  "Novak","Dubois","Silva","Kimura","Bauer","Costa","Ibrahim","Lindqvist","Варга","Moreau",
  "Tanaka","Bergman","Adeyemi","Kowalski","Marchetti",
];

const TASKS = [
  "Oil & filter change",
  "Brake pad replacement",
  "Tire rotation",
  "Coolant flush",
  "Battery pack diagnostics",
  "Transmission service",
  "Annual DOT inspection",
];

export interface SeedResult {
  vehicles: Vehicle[];
  drivers: Driver[];
  maintenance: MaintenanceRecord[];
  serviceHistory: ServiceHistoryEntry[];
}

export function seedFleet(seed = 20240717): SeedResult {
  const rnd = mulberry32(seed);
  const vehicles: Vehicle[] = [];
  const drivers: Driver[] = [];
  const maintenance: MaintenanceRecord[] = [];
  const serviceHistory: ServiceHistoryEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < FLEET_SIZE; i++) {
    const spec = MODELS[i % MODELS.length];
    const depot = DEPOTS[i % DEPOTS.length];
    const id = `veh_${String(i + 1).padStart(3, "0")}`;
    const driverId = `drv_${String(i + 1).padStart(3, "0")}`;
    const plate = `FP-${String(1000 + i * 37).slice(0, 4)}`;

    drivers.push({
      id: driverId,
      name: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
      licenseNumber: `CA-${(482100 + i * 913).toString()}`,
      phone: `+1 415 ${String(200 + i)} ${String(1100 + i * 7).slice(0, 4)}`,
      rating: Number((3.6 + rnd() * 1.4).toFixed(2)),
      assignedVehicleId: id,
    });

    const odometer = Math.round(18_000 + rnd() * 240_000);
    const status: Vehicle["status"] = i % 11 === 0 ? "MAINTENANCE" : i % 7 === 0 ? "PARKED" : "IDLE";

    vehicles.push({
      id,
      vin: `1FP${seed.toString(36).toUpperCase()}${String(100000 + i * 7919)}`,
      plate,
      make: spec.make,
      model: spec.model,
      year: 2018 + (i % 7),
      fuelType: spec.fuel,
      depot: depot.name,
      driverId,
      status,
      healthScore: Math.round(62 + rnd() * 38),
      lastSeenAt: new Date(now).toISOString(),
      latest: {
        id: `tel_seed_${id}`,
        vehicleId: id,
        recordedAt: new Date(now).toISOString(),
        speedKph: 0,
        latitude: depot.lat + (rnd() - 0.5) * 0.22,
        longitude: depot.lng + (rnd() - 0.5) * 0.28,
        heading: Math.round(rnd() * 360),
        fuelLevelPct: Number((22 + rnd() * 75).toFixed(1)),
        batteryVoltage: Number((11.9 + rnd() * 2.1).toFixed(2)),
        rpm: 0,
        engineTempC: Number((72 + rnd() * 16).toFixed(1)),
        tirePressurePsi: Number((30 + rnd() * 6).toFixed(1)),
        odometerKm: odometer,
        ignitionOn: false,
      },
    });

    // Maintenance plan: one upcoming item per vehicle, some already overdue.
    const dueOdo = odometer + Math.round((rnd() - 0.35) * 9000);
    const dueDate = new Date(now + (rnd() - 0.3) * 45 * 864e5);
    maintenance.push({
      id: `mnt_${id}`,
      vehicleId: id,
      vehiclePlate: plate,
      task: TASKS[i % TASKS.length],
      dueAtOdometerKm: dueOdo,
      dueDate: dueDate.toISOString(),
      status: dueOdo <= odometer ? "OVERDUE" : dueDate.getTime() < now + 10 * 864e5 ? "DUE" : "SCHEDULED",
      costUsd: Math.round(180 + rnd() * 1400),
    });

    const historyCount = 2 + Math.floor(rnd() * 3);
    for (let h = 0; h < historyCount; h++) {
      serviceHistory.push({
        id: `svc_${id}_${h}`,
        vehicleId: id,
        performedAt: new Date(now - (h + 1) * (40 + rnd() * 80) * 864e5).toISOString(),
        workshop: ["Bay Fleet Services", "Oakland Diesel Co.", "Peninsula Motors"][h % 3],
        description: TASKS[(i + h + 2) % TASKS.length],
        odometerKm: Math.max(0, odometer - (h + 1) * Math.round(4000 + rnd() * 9000)),
        costUsd: Math.round(140 + rnd() * 1900),
      });
    }
  }

  return { vehicles, drivers, maintenance, serviceHistory };
}
