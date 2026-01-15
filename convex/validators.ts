import { v } from "convex/values";

export const locationTypeValidator = v.union(
  v.literal("country"),
  v.literal("region"),
  v.literal("city"),
  v.literal("airport"),
  v.literal("landmark"),
  v.literal("other"),
);

export type LocationType =
  | "country"
  | "region"
  | "city"
  | "airport"
  | "landmark"
  | "other";
