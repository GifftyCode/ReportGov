import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";

/**
 * Service-level agreement for MDAs to respond. ReportGov's real SLA is 72 hours.
 * For a live demo, set SLA_MINUTES=2 in the Convex dashboard to watch escalation happen.
 */
function slaMs(): number {
  const minutes = Number(process.env.SLA_MINUTES ?? 72 * 60);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 72 * 60) * 60 * 1000;
}

function newReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `RG-${code}`;
}

async function logEvent(
  ctx: MutationCtx,
  complaintId: Id<"complaints">,
  actor: string,
  action: string,
  note?: string,
) {
  await ctx.db.insert("events", { complaintId, actor, action, note });
}

// ---------- Citizens / businesses ----------

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    mdaId: v.id("mdas"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const title = args.title.trim();
    const description = args.description.trim();
    if (title.length < 5 || title.length > 120) {
      throw new ConvexError("Title must be between 5 and 120 characters.");
    }
    if (description.length < 20 || description.length > 2000) {
      throw new ConvexError("Description must be between 20 and 2000 characters.");
    }
    const mda = await ctx.db.get(args.mdaId);
    if (!mda) throw new ConvexError("Please choose a valid MDA.");

    const reference = newReference();
    const id = await ctx.db.insert("complaints", {
      reference,
      title,
      description,
      mdaId: args.mdaId,
      reporterId: user._id,
      status: "open",
      dueAt: Date.now() + slaMs(),
    });
    await logEvent(ctx, id, user.name, "Complaint submitted");

    // The SLA timer: Convex stores this job, so it survives restarts.
    await ctx.scheduler.runAfter(slaMs(), internal.complaints.escalateIfUnresolved, {
      complaintId: id,
    });

    return reference;
  },
});

/** The signed-in user's own complaints, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const complaints = await ctx.db
      .query("complaints")
      .withIndex("by_reporter", (q) => q.eq("reporterId", user._id))
      .order("desc")
      .collect();
    return await withMda(ctx, complaints);
  },
});

/** One complaint with its history. Only the reporter, the MDA's officers, or admins can see it. */
export const get = query({
  args: { reference: v.string() },
  handler: async (ctx, { reference }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const complaint = await ctx.db
      .query("complaints")
      .withIndex("by_reference", (q) => q.eq("reference", reference.toUpperCase()))
      .unique();
    if (!complaint) return null;

    const allowed =
      user.role === "admin" ||
      complaint.reporterId === user._id ||
      (user.role === "officer" && user.mdaId === complaint.mdaId);
    if (!allowed) return null; // don't reveal that it exists

    const mda = await ctx.db.get(complaint.mdaId);
    const events = await ctx.db
      .query("events")
      .withIndex("by_complaint", (q) => q.eq("complaintId", complaint._id))
      .collect();
    return { ...complaint, mda, events };
  },
});

// ---------- MDA officers ----------

/** Complaints for the officer's own MDA only. */
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const officer = await requireRole(ctx, "officer");
    if (!officer.mdaId) return [];
    const complaints = await ctx.db
      .query("complaints")
      .withIndex("by_mda", (q) => q.eq("mdaId", officer.mdaId!))
      .order("desc")
      .collect();
    return await withMda(ctx, complaints);
  },
});

export const updateStatus = mutation({
  args: {
    complaintId: v.id("complaints"),
    status: v.union(v.literal("in_progress"), v.literal("resolved")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { complaintId, status, note }) => {
    const officer = await requireRole(ctx, "officer", "admin");
    const complaint = await ctx.db.get(complaintId);
    if (!complaint) throw new ConvexError("Complaint not found.");

    // Officers may only act on their own MDA's complaints.
    if (officer.role === "officer" && officer.mdaId !== complaint.mdaId) {
      throw new ConvexError("This complaint belongs to another MDA.");
    }
    if (complaint.status === "resolved") {
      throw new ConvexError("This complaint is already resolved.");
    }
    if (status === "resolved" && !note?.trim()) {
      throw new ConvexError("Add a short note telling the business how it was resolved.");
    }

    await ctx.db.patch(complaintId, {
      status,
      responseNote: note?.trim() || complaint.responseNote,
      resolvedAt: status === "resolved" ? Date.now() : undefined,
    });
    await logEvent(
      ctx,
      complaintId,
      officer.name,
      status === "resolved" ? "Marked resolved" : "Started working on it",
      note?.trim(),
    );
  },
});

// ---------- System (scheduled) ----------

export const escalateIfUnresolved = internalMutation({
  args: { complaintId: v.id("complaints") },
  handler: async (ctx, { complaintId }) => {
    const complaint = await ctx.db.get(complaintId);
    if (!complaint || complaint.status === "resolved" || complaint.status === "escalated") return;
    await ctx.db.patch(complaintId, { status: "escalated" });
    await logEvent(ctx, complaintId, "System", "Escalated to PEBEC: SLA deadline missed");
  },
});

// ---------- PEBEC admins ----------

/** Responsiveness leaderboard: share of each MDA's complaints resolved within the SLA. */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const [mdas, complaints] = await Promise.all([
      ctx.db.query("mdas").collect(),
      // Fine for a demo. At national scale, keep running counters per MDA instead.
      ctx.db.query("complaints").collect(),
    ]);

    const now = Date.now();
    const rows = mdas.map((mda) => {
      const mine = complaints.filter((c) => c.mdaId === mda._id);
      const resolvedOnTime = mine.filter(
        (c) => c.status === "resolved" && c.resolvedAt !== undefined && c.resolvedAt <= c.dueAt,
      ).length;
      const escalated = mine.filter((c) => c.status === "escalated").length;
      const pending = mine.filter(
        (c) => (c.status === "open" || c.status === "in_progress") && c.dueAt > now,
      ).length;
      const resolved = mine.filter((c) => c.status === "resolved").length;
      // Score only complaints whose outcome is known (resolved or past deadline).
      const decided = mine.length - pending;
      const score = decided === 0 ? null : Math.round((resolvedOnTime / decided) * 100);
      return {
        mdaId: mda._id,
        acronym: mda.acronym,
        name: mda.name,
        total: mine.length,
        resolved,
        resolvedOnTime,
        escalated,
        pending,
        score,
      };
    });

    return rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.total - a.total);
  },
});

/** All escalated complaints across MDAs, for PEBEC follow-up. */
export const escalated = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const all = await ctx.db.query("complaints").order("desc").collect();
    return await withMda(
      ctx,
      all.filter((c) => c.status === "escalated"),
    );
  },
});

// ---------- helpers ----------

async function withMda(ctx: QueryCtx, complaints: Doc<"complaints">[]) {
  return await Promise.all(
    complaints.map(async (c) => ({ ...c, mda: await ctx.db.get(c.mdaId) })),
  );
}
