# FleetPulse Operations

FleetPulse Operations is a fleet telemetry and operations dashboard built with TanStack Start, React, TypeScript, and Tailwind CSS.

The application simulates a fleet of vehicles, generates telemetry data, evaluates vehicle conditions, and presents fleet health through an operations-focused command center.

## Features

- Simulated fleet of 25 vehicles
- Live vehicle telemetry
- Vehicle location and map visualization
- Speed, fuel, battery, RPM, engine temperature, tire pressure, and odometer data
- Automated operational rules and alerts
- Fleet health monitoring
- Vehicle search and filtering
- Vehicle detail views
- Alert management
- Maintenance tracking
- Fleet analytics and telemetry trends
- Dashboard activity and status views
- API routes for fleet data and simulation
- OpenAPI documentation
- Responsive operations dashboard

## Technology

- React
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Recharts
- React Leaflet
- React Hook Form
- Zod
- Vite

## Application Structure

```text
src/
├── components/
│   ├── fleet/
│   └── ui/
├── hooks/
├── lib/
│   └── fleet/
├── routes/
│   └── api/
├── router.tsx
├── server.ts
├── start.ts
└── styles.css
```

## Fleet Simulation

FleetPulse Operations includes a vehicle simulator that generates telemetry for 25 vehicles.

Telemetry includes:

- Vehicle location
- Speed
- Fuel level
- Battery level
- RPM
- Engine temperature
- Tire pressure
- Odometer

The simulator maintains continuity between readings so vehicle activity behaves more like a live fleet rather than completely random data.

## Rules and Alerts

Telemetry is evaluated against operational conditions to identify potential issues.

Examples include:

- Speeding
- Low fuel
- Low battery
- Engine temperature issues
- Tire pressure issues
- Geofence conditions
- Excessive idling
- Maintenance conditions

Detected conditions are surfaced through the alerts interface.

## Dashboard

The command center provides a fleet-wide operational view including:

- Fleet KPIs
- Vehicle status
- Vehicle map
- Active alerts
- Fleet health
- Telemetry trends
- Fuel analytics
- Activity information
- Search and filtering

## Vehicles

The vehicle interface provides fleet inventory and individual vehicle views.

Vehicle details include current telemetry, location, operational status, alerts, and available vehicle information.

## Analytics

The analytics section provides fleet and vehicle-level information derived from telemetry and operational activity.

## API

The application includes API routes for:

- Vehicle data
- Vehicle details
- Telemetry
- Alerts
- Analytics
- Dashboard data
- Maintenance
- Health
- Telemetry simulation
- OpenAPI documentation

API routes are located under:

```text
src/routes/api/
```

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will be available at the local development URL shown by the development server.

## Project Status

FleetPulse Operations is a portfolio project focused on fleet monitoring, telemetry processing, operational rules, data visualization, and building a practical command-center interface with modern TypeScript and React tooling.

## Future Improvements

Potential improvements include:

- Persistent telemetry storage
- Authentication and role-based access
- Configurable alert rules
- Larger fleet simulations
- More advanced geospatial analysis
- External vehicle data integrations
- Production telemetry streaming infrastructure