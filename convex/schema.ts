import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const characterClasses = [
  "BLESSED",
  "FOX",
  "HEAVY",
  "JUDGE",
  "LIGHTBEARER",
  "MARSHAL",
  "RANGER",
  "SEEKER",
  "WOULD_BE_HERO",
] as const;
export const characterClass = v.union(...characterClasses.map((name) => v.literal(name)));

// the dice roller's model; kept in step with src/pages/dice/dice.ts, which the roll
// functions import for the face tables
export const dieColour = v.union(v.literal("blue"), v.literal("violet"), v.literal("orange"));
export const faceIndex = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
);
// the kinds of message in a campaign's feed; widen as kinds are added
export const messageKind = v.literal("roll");

export default defineSchema({
  // One row per Better Auth user, kept in step by the triggers in auth.ts.
  // Name and picture are Discord's; Better Auth always supplies a picture,
  // Discord's default avatar when the user has none.
  users: defineTable({
    authId: v.string(),
    displayName: v.string(),
    picture: v.string(),
  }).index("by_authId", ["authId"]),
  // inviteToken is the secret in the campaign's invite URL; only the Game
  // Master ever reads it back. rollSeed is the seed of the campaign's next
  // dice roll: every client simulates it ahead of time, a roll must present
  // it to be accepted, and each accepted roll replaces it. Campaigns from
  // before the dice roller have none; see seedOf in messages.ts. messageSequence
  // is the sequence of the campaign's latest message (none before the first):
  // post in messages.ts numbers the next one after it.
  campaigns: defineTable({
    name: v.string(),
    inviteToken: v.string(),
    rollSeed: v.optional(v.number()),
    messageSequence: v.optional(v.number()),
  }).index("by_inviteToken", ["inviteToken"]),
  // Membership is one row per (campaign, user), the Game Master included with
  // isOwner set, so "who is in this campaign" and "who runs it" are answered
  // from one place. Visibility is decided at read time from these rows.
  campaignMembers: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    isOwner: v.boolean(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_userId", ["userId"])
    .index("by_campaignId_and_userId", ["campaignId", "userId"]),
  characters: defineTable({
    name: v.string(),
    class: v.optional(characterClass),
    level: v.number(),
    campaignId: v.id("campaigns"),
    // the player; also who may edit the character
    userId: v.optional(v.id("users")),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_userId_and_campaignId", ["userId", "campaignId"]),
  // The campaign's feed, one row per message of whatever kind. sequence numbers a
  // campaign's messages 1, 2, 3… in the order they were written (the campaign row
  // holds the latest), so "everything after N" is an index range.
  messages: defineTable(
    v.union(
      v.object({
        kind: v.literal("roll"),
        campaignId: v.id("campaigns"),
        userId: v.id("users"),
        sequence: v.number(),
        // the seed decides the faces, stored too (with their totals) so a roll can be
        // read without the dice code
        seed: v.number(),
        // the colour of each die thrown, in slot order, and the face each showed
        dice: v.array(dieColour),
        faces: v.array(faceIndex),
        totals: v.object({ burst: v.number(), special: v.number(), skull: v.number() }),
      }),
      // every future kind carries kind, campaignId, userId and sequence too
    ),
  )
    .index("by_campaignId_and_sequence", ["campaignId", "sequence"])
    .index("by_campaignId_and_kind_and_sequence", ["campaignId", "kind", "sequence"]),
});
