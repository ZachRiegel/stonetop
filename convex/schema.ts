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
  // Master ever reads it back
  campaigns: defineTable({
    name: v.string(),
    inviteToken: v.string(),
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
});
