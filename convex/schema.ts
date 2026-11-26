import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable validators so the same values are enforced everywhere.
export const roleValidator = v.union(
  v.literal("citizen"),
  v.literal("officer"),
  v.literal("admin"),
);

export const statusValidator = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("escalated"),
);

export default defineSchema({
  // One row per signed-in person. Roles live here (server-side),
  // not in the browser, so users cannot promote themselves.
  users: defineTable({
    clerkId: v.string(), // identity.subject from Clerk's JWT
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    mdaId: v.optional(v.id("mdas")), // set for officers only
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Ministries, Departments and Agencies that complaints are filed against.
  mdas: defineTable({
    name: v.string(),
    acronym: v.string(),
  }).index("by_acronym", ["acronym"]),

  complaints: defineTable({
    reference: v.string(), // human-friendly code, e.g. RG-7K2Q9X
    title: v.string(),
    description: v.string(),
    mdaId: v.id("mdas"),
    reporterId: v.id("users"),
    status: statusValidator,
    dueAt: v.number(), // createdAt + SLA (ms since epoch)
    resolvedAt: v.optional(v.number()),
    responseNote: v.optional(v.string()),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_mda", ["mdaId"])
    .index("by_reference", ["reference"]),

  // Audit trail: every change to a complaint is recorded.
  events: defineTable({
    complaintId: v.id("complaints"),
    actor: v.string(), // name of the person, or "System"
    action: v.string(),
    note: v.optional(v.string()),
  }).index("by_complaint", ["complaintId"]),
});
