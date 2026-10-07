/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type T = TestConvex<typeof schema>;

// Profiles normally arrive through the Better Auth triggers; tests seed them
// directly and act as a user by presenting their authId as the JWT subject
const seedUser = (t: T, authId: string, displayName: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", { authId, displayName, picture: `https://cdn.example/${authId}.png` }),
  );

const seedMember = (t: T, campaignId: Id<"campaigns">, userId: Id<"users">) =>
  t.run((ctx) => ctx.db.insert("campaignMembers", { campaignId, userId, isOwner: false }));

const seedCharacter = (t: T, campaignId: Id<"campaigns">, userId: Id<"users">, name: string) =>
  t.run((ctx) =>
    ctx.db.insert("characters", { name, class: "HEAVY", level: 1, campaignId, userId }),
  );

const membersOf = (t: T, campaignId: Id<"campaigns">) =>
  t.run((ctx) =>
    ctx.db
      .query("campaignMembers")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .collect(),
  );

const tokenOf = async (t: T, campaignId: Id<"campaigns">) => {
  const campaign = await t.run((ctx) => ctx.db.get(campaignId));
  if (!campaign) throw new Error("no such campaign");
  return campaign.inviteToken;
};

// A Game Master running a campaign, a player already in it, and an outsider
// who holds the invite token but has not used it
const setup = async () => {
  const t = convexTest(schema, modules);
  const gmId = await seedUser(t, "auth-gm", "Gwendolyn");
  const asGm = t.withIdentity({ subject: "auth-gm" });
  const campaignId = await asGm.mutation(api.campaigns.create, { name: "Stonetop" });
  const playerId = await seedUser(t, "auth-player", "Pat");
  await seedMember(t, campaignId, playerId);
  const outsiderId = await seedUser(t, "auth-outsider", "Olive");
  return {
    t,
    gmId,
    asGm,
    campaignId,
    playerId,
    asPlayer: t.withIdentity({ subject: "auth-player" }),
    outsiderId,
    asOutsider: t.withIdentity({ subject: "auth-outsider" }),
    inviteToken: await tokenOf(t, campaignId),
  };
};

describe("campaigns.create", () => {
  test("inserts the campaign with an invite token and the Game Master's membership", async () => {
    const { t, gmId, campaignId } = await setup();
    expect(await t.run((ctx) => ctx.db.get(campaignId))).toMatchObject({
      name: "Stonetop",
      inviteToken: expect.any(String),
    });
    expect(await membersOf(t, campaignId)).toMatchObject([
      { userId: gmId, isOwner: true },
      { isOwner: false },
    ]);
  });

  test("trims the name", async () => {
    const { t, asGm } = await setup();
    const campaignId = await asGm.mutation(api.campaigns.create, { name: "  Marshedge  " });
    expect(await t.run((ctx) => ctx.db.get(campaignId))).toMatchObject({ name: "Marshedge" });
  });

  test("rejects a blank name without writing anything", async () => {
    const { t, asGm } = await setup();
    await expect(asGm.mutation(api.campaigns.create, { name: "   " })).rejects.toThrow(
      "A campaign needs a name",
    );
    expect(await t.run((ctx) => ctx.db.query("campaigns").collect())).toHaveLength(1);
  });

  test("throws when signed out", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.campaigns.create, { name: "Stonetop" })).rejects.toThrow(
      "UNAUTHENTICATED",
    );
  });
});

describe("campaigns.list", () => {
  test("throws when signed out", async () => {
    const { t } = await setup();
    await expect(t.query(api.campaigns.list)).rejects.toThrow("UNAUTHENTICATED");
  });

  test("returns [] for a user in no campaigns", async () => {
    const { asOutsider } = await setup();
    expect(await asOutsider.query(api.campaigns.list)).toEqual([]);
  });

  test("returns joined and owned campaigns with the caller's role, and nothing else", async () => {
    const { asGm, asPlayer, campaignId } = await setup();
    const ownCampaignId = await asPlayer.mutation(api.campaigns.create, { name: "Marshedge" });
    const roles = (cards: { _id: Id<"campaigns">; name: string; isOwner: boolean }[]) =>
      cards.map(({ _id, name, isOwner }) => ({ _id, name, isOwner }));
    expect(roles(await asPlayer.query(api.campaigns.list))).toEqual([
      { _id: campaignId, name: "Stonetop", isOwner: false },
      { _id: ownCampaignId, name: "Marshedge", isOwner: true },
    ]);
    expect(roles(await asGm.query(api.campaigns.list))).toEqual([
      { _id: campaignId, name: "Stonetop", isOwner: true },
    ]);
  });

  test("lists members with the Game Master first, each with their character in that campaign", async () => {
    const { t, gmId, asGm, campaignId, playerId } = await setup();
    const quinnId = await seedUser(t, "auth-quinn", "Quinn");
    await seedMember(t, campaignId, quinnId);
    const gmCharacterId = await seedCharacter(t, campaignId, gmId, "Rook");
    const quinnCharacterId = await seedCharacter(t, campaignId, quinnId, "Vahid");
    // Pat's character in another campaign must not show up in this one
    await seedCharacter(
      t,
      await asGm.mutation(api.campaigns.create, { name: "Marshedge" }),
      playerId,
      "Elsewhere",
    );
    const [card] = await asGm.query(api.campaigns.list);
    expect(
      card?.members.map(({ _id, displayName, isOwner, character }) => ({
        _id,
        displayName,
        isOwner,
        character: character?._id ?? null,
      })),
    ).toEqual([
      { _id: gmId, displayName: "Gwendolyn", isOwner: true, character: gmCharacterId },
      { _id: playerId, displayName: "Pat", isOwner: false, character: null },
      { _id: quinnId, displayName: "Quinn", isOwner: false, character: quinnCharacterId },
    ]);
    expect(card?.members[2]?.character).toMatchObject({ name: "Vahid", class: "HEAVY", level: 1 });
  });

  test("attaches the caller's own character in each campaign", async () => {
    const { t, gmId, asGm, asPlayer, campaignId, playerId } = await setup();
    const gmCharacterId = await seedCharacter(t, campaignId, gmId, "Rook");
    const playerCharacterId = await seedCharacter(t, campaignId, playerId, "Vahid");
    const otherCampaignId = await asGm.mutation(api.campaigns.create, { name: "Marshedge" });
    expect(
      (await asGm.query(api.campaigns.list)).map(({ _id, myCharacter }) => ({
        _id,
        myCharacter: myCharacter?._id ?? null,
      })),
    ).toEqual([
      { _id: campaignId, myCharacter: gmCharacterId },
      { _id: otherCampaignId, myCharacter: null },
    ]);
    expect(await asPlayer.query(api.campaigns.list)).toMatchObject([
      { _id: campaignId, myCharacter: { _id: playerCharacterId, name: "Vahid" } },
    ]);
  });

  test("hands the invite token to the Game Master only", async () => {
    const { asGm, asPlayer, inviteToken } = await setup();
    expect((await asGm.query(api.campaigns.list))[0]).toHaveProperty("inviteToken", inviteToken);
    expect((await asPlayer.query(api.campaigns.list))[0]).not.toHaveProperty("inviteToken");
  });

  test("never includes another member's authId", async () => {
    const { asPlayer } = await setup();
    const [card] = await asPlayer.query(api.campaigns.list);
    card?.members.forEach((member) => expect(member).not.toHaveProperty("authId"));
    expect(await asPlayer.query(api.users.me)).toHaveProperty("authId", "auth-player");
  });

  test("skips memberships whose campaign has been deleted", async () => {
    const { t, asGm, campaignId } = await setup();
    await t.run((ctx) => ctx.db.delete(campaignId));
    expect(await asGm.query(api.campaigns.list)).toEqual([]);
  });
});

describe("campaigns.get", () => {
  test("returns the full card, invite token included, to the Game Master", async () => {
    const { asGm, gmId, campaignId, playerId, inviteToken } = await setup();
    expect(await asGm.query(api.campaigns.get, { campaignId })).toEqual({
      _id: campaignId,
      _creationTime: expect.any(Number),
      name: "Stonetop",
      isOwner: true,
      inviteToken,
      members: [
        {
          _id: gmId,
          _creationTime: expect.any(Number),
          displayName: "Gwendolyn",
          picture: "https://cdn.example/auth-gm.png",
          isOwner: true,
          character: null,
        },
        {
          _id: playerId,
          _creationTime: expect.any(Number),
          displayName: "Pat",
          picture: "https://cdn.example/auth-player.png",
          isOwner: false,
          character: null,
        },
      ],
      myCharacter: null,
    });
  });

  test("returns the card without the invite token to a player", async () => {
    const { asPlayer, campaignId } = await setup();
    const card = await asPlayer.query(api.campaigns.get, { campaignId });
    expect(card).toMatchObject({ _id: campaignId, isOwner: false });
    expect(card).not.toHaveProperty("inviteToken");
  });

  test("returns null for a non-member", async () => {
    const { asOutsider, campaignId } = await setup();
    expect(await asOutsider.query(api.campaigns.get, { campaignId })).toBeNull();
  });

  test("returns null once the campaign is deleted, even with a membership row left", async () => {
    const { t, asGm, campaignId } = await setup();
    await t.run((ctx) => ctx.db.delete(campaignId));
    expect(await asGm.query(api.campaigns.get, { campaignId })).toBeNull();
  });

  // Campaign ids reach the server straight from the URL, so anything a user
  // can type must read as "not found", never as an error
  test("reads a malformed id or one from another table as not found", async () => {
    const { asGm, gmId } = await setup();
    expect(await asGm.query(api.campaigns.get, { campaignId: "not-an-id" })).toBeNull();
    expect(await asGm.query(api.campaigns.get, { campaignId: "" })).toBeNull();
    expect(await asGm.query(api.campaigns.get, { campaignId: gmId })).toBeNull();
  });

  test("throws when signed out", async () => {
    const { t, campaignId } = await setup();
    await expect(t.query(api.campaigns.get, { campaignId })).rejects.toThrow("UNAUTHENTICATED");
  });
});

describe("campaigns.join", () => {
  test("adds the caller as a player and returns the campaign", async () => {
    const { t, asOutsider, campaignId, gmId, playerId, outsiderId, inviteToken } = await setup();
    expect(await asOutsider.mutation(api.campaigns.join, { inviteToken })).toBe(campaignId);
    expect(await membersOf(t, campaignId)).toMatchObject([
      { userId: gmId, isOwner: true },
      { userId: playerId, isOwner: false },
      { userId: outsiderId, isOwner: false },
    ]);
    expect(await asOutsider.query(api.campaigns.get, { campaignId })).toMatchObject({
      _id: campaignId,
      isOwner: false,
    });
  });

  test("is idempotent for a player already in the campaign", async () => {
    const { t, asPlayer, campaignId, inviteToken } = await setup();
    expect(await asPlayer.mutation(api.campaigns.join, { inviteToken })).toBe(campaignId);
    expect(await asPlayer.mutation(api.campaigns.join, { inviteToken })).toBe(campaignId);
    expect(await membersOf(t, campaignId)).toHaveLength(2);
  });

  test("leaves the Game Master's own membership untouched", async () => {
    const { t, asGm, campaignId, gmId, inviteToken } = await setup();
    expect(await asGm.mutation(api.campaigns.join, { inviteToken })).toBe(campaignId);
    expect((await membersOf(t, campaignId)).filter(({ userId }) => userId === gmId)).toMatchObject([
      { isOwner: true },
    ]);
  });

  test("throws for an unknown token", async () => {
    const { t, asOutsider, campaignId } = await setup();
    await expect(
      asOutsider.mutation(api.campaigns.join, { inviteToken: "not-a-token" }),
    ).rejects.toThrow("This invite link is invalid or has expired");
    expect(await membersOf(t, campaignId)).toHaveLength(2);
  });

  test("throws when signed out", async () => {
    const { t, inviteToken } = await setup();
    await expect(t.mutation(api.campaigns.join, { inviteToken })).rejects.toThrow(
      "UNAUTHENTICATED",
    );
  });
});

describe("campaigns.regenerateInvite", () => {
  test("retires the old token and issues one that works", async () => {
    const { t, asGm, asOutsider, campaignId, inviteToken } = await setup();
    await asGm.mutation(api.campaigns.regenerateInvite, { campaignId });
    const next = await tokenOf(t, campaignId);
    expect(next).not.toBe(inviteToken);
    await expect(asOutsider.mutation(api.campaigns.join, { inviteToken })).rejects.toThrow(
      "This invite link is invalid or has expired",
    );
    expect(await asOutsider.mutation(api.campaigns.join, { inviteToken: next })).toBe(campaignId);
    expect(await membersOf(t, campaignId)).toHaveLength(3);
  });

  test("leaves other campaigns' tokens alone", async () => {
    const { t, asGm, campaignId } = await setup();
    const otherCampaignId = await asGm.mutation(api.campaigns.create, { name: "Marshedge" });
    const otherToken = await tokenOf(t, otherCampaignId);
    await asGm.mutation(api.campaigns.regenerateInvite, { campaignId });
    expect(await tokenOf(t, otherCampaignId)).toBe(otherToken);
  });

  test("throws for a player who is not the Game Master, keeping the token", async () => {
    const { t, asPlayer, campaignId, inviteToken } = await setup();
    await expect(asPlayer.mutation(api.campaigns.regenerateInvite, { campaignId })).rejects.toThrow(
      "Only the Game Master may do that",
    );
    expect(await tokenOf(t, campaignId)).toBe(inviteToken);
  });

  test("throws for a non-member", async () => {
    const { asOutsider, campaignId } = await setup();
    await expect(
      asOutsider.mutation(api.campaigns.regenerateInvite, { campaignId }),
    ).rejects.toThrow("Only the Game Master may do that");
  });

  test("throws when signed out", async () => {
    const { t, campaignId } = await setup();
    await expect(t.mutation(api.campaigns.regenerateInvite, { campaignId })).rejects.toThrow(
      "UNAUTHENTICATED",
    );
  });
});
