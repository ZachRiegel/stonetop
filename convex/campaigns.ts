import { v } from "convex/values";

import { newSeed } from "../src/pages/dice/dice";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { membershipOf, requireGameMaster, requireUser } from "./lib/access";
import { seedOf } from "./messages";
import schema from "./schema";

// Every campaign read returns this: the campaign as the caller sees it. Other
// members appear without their internal authId, the invite token is only
// present for the Game Master, since it is the secret in the invite URL, and
// rollSeed is always the seed of the next dice roll (see messages.ts).
const card = schema
  .doc("campaigns")
  .omit("inviteToken", "rollSeed")
  .extend({
    rollSeed: v.number(),
    isOwner: v.boolean(),
    inviteToken: v.optional(v.string()),
    members: v.array(
      schema
        .doc("users")
        .omit("authId")
        .extend({
          isOwner: v.boolean(),
          character: v.union(schema.doc("characters"), v.null()),
        }),
    ),
    myCharacter: v.union(schema.doc("characters"), v.null()),
  });

// Built from the caller's membership row. Members come in join order, the
// Game Master first since their row is written with the campaign; a campaign
// has a handful of members, so they are read whole.
const cardOf = async (ctx: QueryCtx, membership: Doc<"campaignMembers">) => {
  const campaign = await ctx.db.get(membership.campaignId);
  if (!campaign) return null;
  const rows = await ctx.db
    .query("campaignMembers")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id))
    .collect();
  const members = (
    await Promise.all(
      rows.map(async (row) => {
        const user = await ctx.db.get(row.userId);
        if (!user) return null;
        const { authId: _authId, ...profile } = user;
        return {
          ...profile,
          isOwner: row.isOwner,
          character: await ctx.db
            .query("characters")
            .withIndex("by_userId_and_campaignId", (q) =>
              q.eq("userId", row.userId).eq("campaignId", campaign._id),
            )
            .first(),
        };
      }),
    )
  ).filter((member) => member !== null);
  const { inviteToken, rollSeed: _rollSeed, ...visible } = campaign;
  return {
    ...visible,
    rollSeed: seedOf(campaign),
    ...(membership.isOwner ? { inviteToken } : {}),
    isOwner: membership.isOwner,
    members,
    myCharacter: members.find((member) => member._id === membership.userId)?.character ?? null,
  };
};

// Every campaign the caller is in, in the order they joined them
export const list = query({
  args: {},
  returns: v.array(card),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const memberships = await ctx.db
      .query("campaignMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const cards = await Promise.all(memberships.map((membership) => cardOf(ctx, membership)));
    return cards.filter((campaign) => campaign !== null);
  },
});

// Takes the route param as typed in the URL: a malformed, stale or foreign id
// and a campaign the caller is not in all read as null, never as an error
export const get = query({
  args: { campaignId: v.string() },
  returns: v.union(card, v.null()),
  handler: async (ctx, { campaignId }) => {
    const user = await requireUser(ctx);
    const id = ctx.db.normalizeId("campaigns", campaignId);
    const membership = id && (await membershipOf(ctx, id, user._id));
    return membership ? await cardOf(ctx, membership) : null;
  },
});

// A new campaign comes with its invite token and its Game Master's membership
export const create = mutation({
  args: { name: v.string() },
  returns: v.id("campaigns"),
  handler: async (ctx, { name }) => {
    const user = await requireUser(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("A campaign needs a name");
    const campaignId = await ctx.db.insert("campaigns", {
      name: trimmed,
      inviteToken: crypto.randomUUID(),
      rollSeed: newSeed(),
    });
    await ctx.db.insert("campaignMembers", { campaignId, userId: user._id, isOwner: true });
    return campaignId;
  },
});

// Joins the caller to the campaign behind an invite URL and returns it. Anyone
// already in the campaign succeeds without a write, so re-opening an invite
// URL is harmless.
export const join = mutation({
  args: { inviteToken: v.string() },
  returns: v.id("campaigns"),
  handler: async (ctx, { inviteToken }) => {
    const user = await requireUser(ctx);
    const campaign = await ctx.db
      .query("campaigns")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", inviteToken))
      .unique();
    if (!campaign) throw new Error("This invite link is invalid or has expired");
    if (!(await membershipOf(ctx, campaign._id, user._id)))
      await ctx.db.insert("campaignMembers", {
        campaignId: campaign._id,
        userId: user._id,
        isOwner: false,
      });
    return campaign._id;
  },
});

// Every invite URL in circulation stops working. Randomness is seeded per
// execution, so a retried mutation writes the same token.
export const regenerateInvite = mutation({
  args: { campaignId: v.id("campaigns") },
  returns: v.null(),
  handler: async (ctx, { campaignId }) => {
    await requireGameMaster(ctx, campaignId);
    await ctx.db.patch(campaignId, { inviteToken: crypto.randomUUID() });
    return null;
  },
});
