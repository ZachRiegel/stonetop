import type { Doc } from "_generated/dataModel";
import { mutation, type MutationCtx, query } from "_generated/server";
import type { WithoutSystemFields } from "convex/server";
import { ConvexError, v } from "convex/values";
import { membershipOf, requireMember, requireUser } from "lib/access";
import { drawFaces, MAX_POOL, mulberry32, newSeed, score } from "pages/dice/dice";
import schema, { dieColour, messageKind } from "schema";

// The seed of a campaign's next roll. A campaign made before the dice roller has
// none stored; its first roll uses a seed derived from its creation time, and
// every roll after that is stored.
export const seedOf = (campaign: Doc<"campaigns">) =>
  campaign.rollSeed ?? Math.floor(campaign._creationTime) % 2 ** 32;

// Omit over a union keeps only the shared keys; distributed, each kind keeps its own
type Draft<M> = M extends unknown ? Omit<M, "sequence"> : never;

// Appends a message to its campaign's feed, numbered after the campaign's latest, and
// moves the campaign on to it. Callers check membership first. Two posts to one campaign
// at once conflict on the campaign row and one is retried, so sequences never repeat.
export const post = async (
  ctx: MutationCtx,
  message: Draft<WithoutSystemFields<Doc<"messages">>>,
) => {
  const campaign = await ctx.db.get(message.campaignId);
  if (!campaign) throw new Error("This campaign no longer exists");
  const sequence = (campaign.messageSequence ?? 0) + 1;
  await ctx.db.patch(campaign._id, { messageSequence: sequence });
  return ctx.db.insert("messages", { ...message, sequence });
};

// a message with its sender; the table's union has no .extend, so one line per kind
const [rollMessage] = schema.doc("messages").members;
const authored = v.union(
  rollMessage.extend({ author: schema.doc("users").pick("displayName", "picture") }),
);

// The campaign's newest message of this kind (or of any kind, "all") and who sent it:
// null before the first, and for anyone outside the campaign
export const latest = query({
  args: { campaignId: v.string(), kind: v.union(messageKind, v.literal("all")) },
  returns: v.union(authored, v.null()),
  handler: async (ctx, { campaignId, kind }) => {
    const user = await requireUser(ctx);
    const id = ctx.db.normalizeId("campaigns", campaignId);
    if (!id || !(await membershipOf(ctx, id, user._id))) return null;
    const message = await (
      kind === "all"
        ? ctx.db
            .query("messages")
            .withIndex("by_campaignId_and_sequence", (q) => q.eq("campaignId", id))
        : ctx.db
            .query("messages")
            .withIndex("by_campaignId_and_kind_and_sequence", (q) =>
              q.eq("campaignId", id).eq("kind", kind),
            )
    )
      .order("desc")
      .first();
    const sender = message && (await ctx.db.get(message.userId));
    return message && sender
      ? { ...message, author: { displayName: sender.displayName, picture: sender.picture } }
      : null;
  },
});

// Posts a roll of these dice with the campaign's current seed and moves the campaign
// on to a fresh one. The seed is presented back so two players rolling at once cannot
// both land: the second throw finds the seed already replaced and is declined with a
// SEED_CONFLICT the client can tell apart from a failure.
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
    await post(ctx, {
      kind: "roll",
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
