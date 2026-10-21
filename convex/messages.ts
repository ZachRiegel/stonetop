import type { Doc } from "_generated/dataModel";
import { mutation, type MutationCtx, query, type QueryCtx } from "_generated/server";
import type { WithoutSystemFields } from "convex/server";
import { ConvexError, v } from "convex/values";
import { membershipFromParam, requireMember } from "lib/access";
import { drawFaces, MAX_POOL, mulberry32, newSeed, rolledOf, score } from "pages/dice/dice";
import schema, { dieColour, messageKind } from "schema";

// The seed of a campaign's next roll. A campaign made before the dice roller has
// none stored; its first roll uses a seed derived from its creation time, and
// every roll after that is stored.
export const seedOf = (campaign: Doc<"campaigns">) =>
  campaign.rollSeed ?? Math.floor(campaign._creationTime) % 2 ** 32;

// Omit over a union keeps only the shared keys; distributed, each kind keeps its own
type Draft<M> = M extends unknown ? Omit<M, "sequence"> : never;

// Appends a message to the campaign's feed, numbered after the campaign's latest, and moves
// the campaign on to it, with any other change to the campaign (`also`) in the same write.
// Callers check membership and read the campaign first. Two posts to one campaign at once
// conflict on the campaign row and one is retried, so sequences never repeat.
const post = async (
  ctx: MutationCtx,
  campaign: Doc<"campaigns">,
  message: Draft<WithoutSystemFields<Doc<"messages">>>,
  also: Partial<WithoutSystemFields<Doc<"campaigns">>> = {},
) => {
  const sequence = (campaign.messageSequence ?? 0) + 1;
  await ctx.db.patch(campaign._id, { ...also, messageSequence: sequence });
  return ctx.db.insert("messages", { ...message, sequence });
};

// a message with its sender; the table's union has no .extend, so one line per kind
const [rollMessage] = schema.doc("messages").members;
const authored = v.union(
  rollMessage.extend({ author: schema.doc("users").pick("displayName", "picture") }),
);
// the message and who sent it, or null once the sender's row is gone
const withAuthor = async (ctx: QueryCtx, message: Doc<"messages">) => {
  const sender = await ctx.db.get(message.userId);
  return sender
    ? { ...message, author: { displayName: sender.displayName, picture: sender.picture } }
    : null;
};

// The campaign's newest message of this kind (or of any kind, "all") and who sent it:
// null before the first, and for anyone outside the campaign
export const latest = query({
  args: { campaignId: v.string(), kind: v.union(messageKind, v.literal("all")) },
  returns: v.union(authored, v.null()),
  handler: async (ctx, { campaignId, kind }) => {
    const id = (await membershipFromParam(ctx, campaignId))?.campaignId;
    if (!id) return null;
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
    return message && withAuthor(ctx, message);
  },
});

// The campaign's last 20 rolls, newest first, each with who threw it: the roll log shows
// that many and does not page yet. Empty for anyone outside the campaign.
export const recent = query({
  args: { campaignId: v.string() },
  returns: v.array(authored),
  handler: async (ctx, { campaignId }) => {
    const id = (await membershipFromParam(ctx, campaignId))?.campaignId;
    if (!id) return [];
    const rolls = await ctx.db
      .query("messages")
      .withIndex("by_campaignId_and_kind_and_sequence", (q) =>
        q.eq("campaignId", id).eq("kind", "roll"),
      )
      .order("desc")
      .take(20);
    return (await Promise.all(rolls.map((roll) => withAuthor(ctx, roll)))).filter(
      (roll) => roll !== null,
    );
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
    await post(
      ctx,
      campaign,
      {
        kind: "roll",
        campaignId,
        userId: membership.userId,
        seed,
        dice,
        faces,
        totals: score(rolledOf(dice, faces)),
      },
      { rollSeed: newSeed() },
    );
    return null;
  },
});
