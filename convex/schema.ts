import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { locationTypeValidator } from "./validators";

export default defineSchema({
  locations: defineTable({
    name: v.string(),
    type: locationTypeValidator,
    parentId: v.union(v.id("locations"), v.null()),
    iso2: v.optional(v.string()),
    iso3: v.optional(v.string()),
    iata: v.optional(v.string()),
    icao: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_parent", ["parentId"])
    .index("by_type_parent", ["type", "parentId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["type", "parentId"],
    }),
});
