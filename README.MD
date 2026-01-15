# Convex Locations App

Convex backend for managing hierarchical locations (countries, regions, cities,
airports, landmarks, and more). Each location can store optional coordinates for
future map rendering.

## Data model

- `locations`
  - `name`: display name
  - `type`: `country | region | city | airport | landmark | other`
  - `parentId`: parent location id or `null` for root nodes
  - `iso2`: optional ISO-3166-1 alpha-2 code
  - `iso3`: optional ISO-3166-1 alpha-3 code
  - `iata`: optional IATA airport code
  - `icao`: optional ICAO airport code
  - `latitude`, `longitude`: optional coordinates
  - `timezone`: optional timezone identifier
  - `description`: optional freeform text
  - `createdAt`, `updatedAt`: timestamps in ms

## Convex functions

- `createLocation`
- `updateLocation`
- `removeLocation`
- `getLocation`
- `listLocations`
- `searchLocations`

## Usage

```bash
npm install
npm run convex:dev
```

If you want generated types, run:

```bash
npm run convex:codegen
```
