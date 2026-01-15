import { mutationGeneric, queryGeneric } from "convex/server";
import { v, type Id } from "convex/values";
import { locationTypeValidator } from "./validators";

const mutation = mutationGeneric;
const query = queryGeneric;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(limit?: number) {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isFinite(limit)) {
    throw new Error("Limit must be a finite number.");
  }
  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function normalizeName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Location name cannot be empty.");
  }
  return trimmed;
}

function normalizeCode(code?: string) {
  if (code === undefined) {
    return undefined;
  }
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    throw new Error("Code cannot be empty.");
  }
  return trimmed;
}

function normalizeTimezone(timezone?: string) {
  if (timezone === undefined) {
    return undefined;
  }
  const trimmed = timezone.trim();
  if (!trimmed) {
    throw new Error("Timezone cannot be empty.");
  }
  return trimmed;
}

function validateCoordinates(latitude?: number, longitude?: number) {
  if (latitude === undefined && longitude === undefined) {
    return;
  }
  if (latitude === undefined || longitude === undefined) {
    throw new Error("Latitude and longitude must be provided together.");
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
}

export const createLocation = mutation({
  args: {
    name: v.string(),
    type: locationTypeValidator,
    parentId: v.optional(v.id("locations")),
    code: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    const code = normalizeCode(args.code);
    const timezone = normalizeTimezone(args.timezone);
    validateCoordinates(args.latitude, args.longitude);

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) {
        throw new Error("Parent location not found.");
      }
    }

    const now = Date.now();
    return ctx.db.insert("locations", {
      name,
      type: args.type,
      parentId: args.parentId ?? null,
      code,
      latitude: args.latitude,
      longitude: args.longitude,
      timezone,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLocation = mutation({
  args: {
    id: v.id("locations"),
    name: v.optional(v.string()),
    type: v.optional(locationTypeValidator),
    parentId: v.optional(v.union(v.id("locations"), v.null())),
    code: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    timezone: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) {
      patch.name = normalizeName(args.name);
    }
    if (args.type !== undefined) {
      patch.type = args.type;
    }
    if (args.parentId !== undefined) {
      if (args.parentId === args.id) {
        throw new Error("A location cannot be its own parent.");
      }
      if (args.parentId !== null) {
        const parent = await ctx.db.get(args.parentId);
        if (!parent) {
          throw new Error("Parent location not found.");
        }
      }
      patch.parentId = args.parentId;
    }
    if (args.code !== undefined) {
      patch.code = normalizeCode(args.code);
    }
    if (args.latitude !== undefined || args.longitude !== undefined) {
      validateCoordinates(args.latitude, args.longitude);
      patch.latitude = args.latitude;
      patch.longitude = args.longitude;
    }
    if (args.timezone !== undefined) {
      patch.timezone = normalizeTimezone(args.timezone);
    }
    if (args.description !== undefined) {
      patch.description = args.description;
    }

    patch.updatedAt = Date.now();
    await ctx.db.patch(args.id, patch);
  },
});

export const removeLocation = mutation({
  args: {
    id: v.id("locations"),
    cascade: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.cascade) {
      const children = await ctx.db
        .query("locations")
        .withIndex("by_parent", (q) => q.eq("parentId", args.id))
        .take(1);
      if (children.length > 0) {
        throw new Error(
          "Location has children. Use cascade to delete the subtree.",
        );
      }
      await ctx.db.delete(args.id);
      return;
    }

    const toVisit: Array<Id<"locations">> = [args.id];
    const toDelete: Array<Id<"locations">> = [];
    const seen = new Set<Id<"locations">>();

    while (toVisit.length > 0) {
      const currentId = toVisit.pop();
      if (!currentId || seen.has(currentId)) {
        continue;
      }
      seen.add(currentId);
      toDelete.push(currentId);

      const children = await ctx.db
        .query("locations")
        .withIndex("by_parent", (q) => q.eq("parentId", currentId))
        .collect();
      for (const child of children) {
        toVisit.push(child._id);
      }
    }

    for (const id of toDelete.reverse()) {
      await ctx.db.delete(id);
    }
  },
});

export const getLocation = query({
  args: { id: v.id("locations") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listLocations = query({
  args: {
    type: v.optional(locationTypeValidator),
    parentId: v.optional(v.union(v.id("locations"), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit);

    if (args.type !== undefined && args.parentId !== undefined) {
      return ctx.db
        .query("locations")
        .withIndex("by_type_parent", (q) => q.eq("type", args.type))
        .filter((q) => q.eq(q.field("parentId"), args.parentId))
        .take(limit);
    }

    if (args.type !== undefined) {
      return ctx.db
        .query("locations")
        .withIndex("by_type", (q) => q.eq("type", args.type))
        .take(limit);
    }

    if (args.parentId !== undefined) {
      return ctx.db
        .query("locations")
        .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
        .take(limit);
    }

    return ctx.db.query("locations").take(limit);
  },
});

export const searchLocations = query({
  args: {
    query: v.string(),
    type: v.optional(locationTypeValidator),
    parentId: v.optional(v.union(v.id("locations"), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.query.trim();
    if (!term) {
      return [];
    }
    const limit = clampLimit(args.limit);

    return ctx.db
      .query("locations")
      .withSearchIndex("search_name", (q) => {
        let builder = q.search("name", term);
        if (args.type !== undefined) {
          builder = builder.eq("type", args.type);
        }
        if (args.parentId !== undefined) {
          builder = builder.eq("parentId", args.parentId);
        }
        return builder;
      })
      .take(limit);
  },
});
