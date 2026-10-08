import { ConvexError, v } from "convex/values";

import { drawFaces, MAX_POOL, mulberry32, newSeed, score } from "../src/pages/dice/dice";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { membershipOf, requireMember, requireUser } from "./lib/access";
import schema, { dieColour } from "./schema";

// The seed of a campaign's next roll. A campaign made before the dice roller has
// none stored; its first roll uses a seed derived from its creation time, and
// every roll after that is stored.
export const seedOf = (campaign: Doc<"campaigns">) =>
  campaign.rollSeed ?? Math.floor(campaign._creationTime) % 2 ** 32;

const latestRoll = schema.doc("rolls").extend({
  roller: schema.doc("users").pick("displayName", "picture"),
});

// The campaign's most recent roll and who threw it: null before the first roll, and
// for anyone outside the campaign
export const latest = query({
  args: { campaignId: v.string() },
  returns: v.union(latestRoll, v.null()),
  handler: async (ctx, { campaignId }) => {
    const user = await requireUser(ctx);
    const id = ctx.db.normalizeId("campaigns", campaignId);
    if (!id || !(await membershipOf(ctx, id, user._id))) return null;
    const roll = await ctx.db
      .query("rolls")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", id))
      .order("desc")
      .first();
    const roller = roll && (await ctx.db.get(roll.userId));
    return roll && roller
      ? { ...roll, roller: { displayName: roller.displayName, picture: roller.picture } }
      : null;
  },
});

// Records a roll of these dice with the campaign's current seed and moves the
// campaign on to a fresh one. The seed is presented back so two players rolling
// at once cannot both land: the second throw finds the seed already replaced and
// is declined with a SEED_CONFLICT the client can tell apart from a failure.
export const roll = mutation({
  args: { campaignId: v.id("campaigns"), seed: v.number(), dice: v.array(dieColour) },
  returns: v.null(),
  handler: async (ctx, { campaignId, seed, dice }) => {
    const membership = await requireMember(ctx, campaignId);
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) throw new Error("This campaign no longer exists");
    if (dice.length < 1 || dice.length > MAX_POOL)
      throw new Error(`A roll is 1 to ${MAX_POOL} dice`);
    if (seed !== seedOf(campaign)) throw new ConvexError({ code: "SEED_CONFLICT" });
    const faces = drawFaces(mulberry32(seed), dice.length);
    await ctx.db.insert("rolls", {
      campaignId,
      userId: membership.userId,
      seed,
      dice,
      faces,
      totals: score(dice.map((colour, i) => ({ colour, face: faces[i] ?? 0 }))),
    });
    await ctx.db.patch(campaignId, { rollSeed: newSeed() });
    return null;
  },
});
