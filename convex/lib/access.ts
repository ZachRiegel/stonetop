import type { Doc, Id } from "_generated/dataModel";
import type { MutationCtx, QueryCtx } from "_generated/server";
import { ConvexError } from "convex/values";

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

// The caller's membership row in the campaign a route param names, or null for a malformed,
// stale or foreign id and for a campaign they are not in; signed out still throws
export const membershipFromParam = async (ctx: Ctx, campaignId: string) => {
  const user = await requireUser(ctx);
  const id = ctx.db.normalizeId("campaigns", campaignId);
  return id && (await membershipOf(ctx, id, user._id));
};

const callerMembership = async (ctx: Ctx, campaignId: Id<"campaigns">) =>
  membershipOf(ctx, campaignId, (await requireUser(ctx))._id);

export const requireMember = async (ctx: Ctx, campaignId: Id<"campaigns">) => {
  const membership = await callerMembership(ctx, campaignId);
  if (!membership) throw new Error("You are not in this campaign");
  return membership;
};

export const requireGameMaster = async (ctx: Ctx, campaignId: Id<"campaigns">) => {
  if (!(await callerMembership(ctx, campaignId))?.isOwner)
    throw new Error("Only the Game Master may do that");
};
