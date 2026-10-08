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
  // before the dice roller have none; see seedOf in rolls.ts.
  campaigns: defineTable({
    name: v.string(),
    inviteToken: v.string(),
    rollSeed: v.optional(v.number()),
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
  // One row per dice roll in a campaign. The seed decides the faces, which are
  // stored too (with their totals) so a roll can be read without the dice code.
  rolls: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    seed: v.number(),
    // the colour of each die thrown, in slot order
    dice: v.array(dieColour),
    // the face each die showed, in the same order
    faces: v.array(faceIndex),
    totals: v.object({ burst: v.number(), special: v.number(), skull: v.number() }),
  }).index("by_campaignId", ["campaignId"]),
});
