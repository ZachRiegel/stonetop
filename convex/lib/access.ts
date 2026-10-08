import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

// The signed-in user's profile row. The JWT subject is the Better Auth user
// id, which the auth triggers store as `authId`. No identity, or no profile
// behind it (a session whose account was deleted), throws a ConvexError: it
// reaches the browser intact, where a plain error is redacted to "Server
// Error" in production, so the client can recognise it and sign out.
export const requireUser = async (ctx: Ctx): Promise<Doc<"users">> => {
  const identity = await ctx.auth.getUserIdentity();
  const user =
    identity &&
    (await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique());
  if (!user) throw new ConvexError({ code: "UNAUTHENTICATED" });
  return user;
};

// A user's membership row in a campaign, or null when they are not in it
export const membershipOf = (ctx: Ctx, campaignId: Id<"campaigns">, userId: Id<"users">) =>
  ctx.db
    .query("campaignMembers")
    .withIndex("by_campaignId_and_userId", (q) =>
      q.eq("campaignId", campaignId).eq("userId", userId),
    )
    .unique();

export const requireMember = async (ctx: Ctx, campaignId: Id<"campaigns">) => {
  const membership = await membershipOf(ctx, campaignId, (await requireUser(ctx))._id);
  if (!membership) throw new Error("You are not in this campaign");
  return membership;
};

export const requireGameMaster = async (ctx: Ctx, campaignId: Id<"campaigns">) => {
  const membership = await membershipOf(ctx, campaignId, (await requireUser(ctx))._id);
  if (!membership?.isOwner) throw new Error("Only the Game Master may do that");
};
