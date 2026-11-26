import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
export type Role = Doc<"users">["role"];

/** The signed-in user's row, or null if signed out / not yet stored. */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Throws unless someone is signed in. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("Please sign in first.");
  return user;
}

/** Throws unless the signed-in user has one of the given roles. */
export async function requireRole(ctx: Ctx, ...roles: Role[]): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role)) {
    throw new ConvexError("You don't have permission to do that.");
  }
  return user;
}
