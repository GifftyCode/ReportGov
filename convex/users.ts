import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { roleValidator } from "./schema";
import { getCurrentUser } from "./lib/auth";

/**
 * Called by the browser right after sign-in. Creates the user's row the first
 * time (always as a citizen) and keeps their name/email in sync afterwards.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not signed in.");

    const name = identity.name ?? identity.email ?? "Anonymous";
    const email = identity.email ?? "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch(existing._id, { name, email });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role: "citizen",
    });
  },
});

/** The current user plus their MDA (for officers). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const mda = user.mdaId ? await ctx.db.get(user.mdaId) : null;
    return { ...user, mda };
  },
});

/**
 * Admin-only operation, run from the Convex dashboard or CLI, never from the browser:
 *   npx convex run users:setRole '{"email":"you@example.com","role":"officer","mdaAcronym":"NPA"}'
 */
export const setRole = internalMutation({
  args: {
    email: v.string(),
    role: roleValidator,
    mdaAcronym: v.optional(v.string()),
  },
  handler: async (ctx, { email, role, mdaAcronym }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new ConvexError(`No user with email ${email}. Sign in once first.`);

    let mdaId = undefined;
    if (role === "officer") {
      if (!mdaAcronym) throw new ConvexError("Officers need an mdaAcronym, e.g. NPA.");
      const mda = await ctx.db
        .query("mdas")
        .withIndex("by_acronym", (q) => q.eq("acronym", mdaAcronym.toUpperCase()))
        .unique();
      if (!mda) throw new ConvexError(`Unknown MDA ${mdaAcronym}. Run mdas:seed first.`);
      mdaId = mda._id;
    }

    await ctx.db.patch(user._id, { role, mdaId });
    return `${user.name} is now ${role}${mdaAcronym ? ` (${mdaAcronym.toUpperCase()})` : ""}.`;
  },
});
