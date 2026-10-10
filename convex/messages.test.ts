/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";

import { DICE, drawFaces, mulberry32 } from "../src/pages/dice/dice";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type T = TestConvex<typeof schema>;

const seedUser = (t: T, authId: string, displayName: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", { authId, displayName, picture: `https://cdn.example/${authId}.png` }),
  );

// the campaign's feed in order
const messagesOf = (t: T, campaignId: Id<"campaigns">) =>
  t.run((ctx) =>
    ctx.db
      .query("messages")
      .withIndex("by_campaignId_and_sequence", (q) => q.eq("campaignId", campaignId))
      .collect(),
  );

// the stored seed of the campaign's next roll
const seedOf = async (t: T, campaignId: Id<"campaigns">) => {
  const campaign = await t.run((ctx) => ctx.db.get(campaignId));
  if (campaign?.rollSeed === undefined) throw new Error("no stored seed");
  return campaign.rollSeed;
};
const sequenceOf = async (t: T, campaignId: Id<"campaigns">) =>
  (await t.run((ctx) => ctx.db.get(campaignId)))?.messageSequence;

// A Game Master running a campaign, a player in it, and an outsider
const setup = async () => {
  const t = convexTest(schema, modules);
  const gmId = await seedUser(t, "auth-gm", "Gwendolyn");
  const asGm = t.withIdentity({ subject: "auth-gm" });
  const campaignId = await asGm.mutation(api.campaigns.create, { name: "Stonetop" });
  const playerId = await seedUser(t, "auth-player", "Pat");
  await t.run((ctx) =>
    ctx.db.insert("campaignMembers", { campaignId, userId: playerId, isOwner: false }),
  );
  await seedUser(t, "auth-outsider", "Olive");
  const card = await asGm.query(api.campaigns.get, { campaignId });
  if (!card) throw new Error("no card");
  return {
    t,
    gmId,
    asGm,
    campaignId,
    playerId,
    asPlayer: t.withIdentity({ subject: "auth-player" }),
    asOutsider: t.withIdentity({ subject: "auth-outsider" }),
    seed: card.rollSeed,
  };
};

describe("campaigns.get", () => {
  test("hands every member the stored seed of the next roll", async () => {
    const { t, asPlayer, campaignId, seed } = await setup();
    expect(seed).toBe(await seedOf(t, campaignId));
    expect((await asPlayer.query(api.campaigns.get, { campaignId }))?.rollSeed).toBe(seed);
  });

  test("derives a seed for a campaign from before the dice roller", async () => {
    const { t, asGm, campaignId } = await setup();
    await t.run((ctx) => ctx.db.patch(campaignId, { rollSeed: undefined }));
    const card = await asGm.query(api.campaigns.get, { campaignId });
    expect(card?.rollSeed).toEqual(expect.any(Number));
    expect(await asGm.query(api.campaigns.get, { campaignId })).toEqual(card);
  });
});

describe("messages.roll", () => {
  test("posts the roll with the faces and totals its seed decides, then moves the seed on", async () => {
    const { t, asPlayer, campaignId, playerId, seed } = await setup();
    await asPlayer.mutation(api.messages.roll, { campaignId, seed, dice: ["blue", "orange"] });
    const faces = drawFaces(mulberry32(seed), 2);
    const [blue, orange] = faces.map((face, i) => DICE[i ? "orange" : "blue"].faces[face]);
    expect(await messagesOf(t, campaignId)).toMatchObject([
      {
        kind: "roll",
        sequence: 1,
        userId: playerId,
        seed,
        dice: ["blue", "orange"],
        faces,
        totals: {
          burst: (blue?.burst ?? 0) + (orange?.burst ?? 0),
          special: (blue?.special ?? 0) + (orange?.special ?? 0),
          skull: (blue?.skull ?? 0) + (orange?.skull ?? 0),
        },
      },
    ]);
    expect(await seedOf(t, campaignId)).not.toBe(seed);
  });

  test("accepts the derived seed of a campaign from before the dice roller", async () => {
    const { t, asGm, campaignId } = await setup();
    await t.run((ctx) => ctx.db.patch(campaignId, { rollSeed: undefined }));
    const card = await asGm.query(api.campaigns.get, { campaignId });
    await asGm.mutation(api.messages.roll, {
      campaignId,
      seed: card?.rollSeed ?? -1,
      dice: ["blue"],
    });
    expect(await messagesOf(t, campaignId)).toHaveLength(1);
    expect(await seedOf(t, campaignId)).toEqual(expect.any(Number));
  });

  test("declines a seed another roll has already used, writing nothing", async () => {
    const { t, asGm, asPlayer, campaignId, seed } = await setup();
    await asGm.mutation(api.messages.roll, { campaignId, seed, dice: ["violet"] });
    const next = await seedOf(t, campaignId);
    await expect(
      asPlayer.mutation(api.messages.roll, { campaignId, seed, dice: ["violet"] }),
    ).rejects.toMatchObject({ data: { code: "SEED_CONFLICT" } });
    expect(await messagesOf(t, campaignId)).toHaveLength(1);
    expect(await seedOf(t, campaignId)).toBe(next);
  });

  test("rejects an empty roll and one over the pool cap", async () => {
    const { t, asGm, campaignId, seed } = await setup();
    await expect(asGm.mutation(api.messages.roll, { campaignId, seed, dice: [] })).rejects.toThrow(
      "1 to 5 dice",
    );
    await expect(
      asGm.mutation(api.messages.roll, { campaignId, seed, dice: Array(6).fill("blue") }),
    ).rejects.toThrow("1 to 5 dice");
    expect(await messagesOf(t, campaignId)).toHaveLength(0);
  });

  test("throws for a non-member and when signed out", async () => {
    const { t, asOutsider, campaignId, seed } = await setup();
    await expect(
      asOutsider.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] }),
    ).rejects.toThrow("not in this campaign");
    await expect(
      t.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] }),
    ).rejects.toThrow("UNAUTHENTICATED");
    expect(await messagesOf(t, campaignId)).toHaveLength(0);
  });
});

describe("messages.post", () => {
  test("numbers a campaign's messages in order, whoever sends them, and keeps the latest on the campaign", async () => {
    const { t, asGm, asPlayer, campaignId, gmId, playerId, seed } = await setup();
    expect(await sequenceOf(t, campaignId)).toBeUndefined();
    await asGm.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] });
    await asPlayer.mutation(api.messages.roll, {
      campaignId,
      seed: await seedOf(t, campaignId),
      dice: ["blue"],
    });
    await asGm.mutation(api.messages.roll, {
      campaignId,
      seed: await seedOf(t, campaignId),
      dice: ["blue"],
    });
    expect(await messagesOf(t, campaignId)).toMatchObject([
      { sequence: 1, userId: gmId },
      { sequence: 2, userId: playerId },
      { sequence: 3, userId: gmId },
    ]);
    expect(await sequenceOf(t, campaignId)).toBe(3);
  });

  test("leaves no gap after a declined post", async () => {
    const { t, asGm, asPlayer, campaignId, seed } = await setup();
    await asGm.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] });
    await expect(
      asPlayer.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] }),
    ).rejects.toMatchObject({ data: { code: "SEED_CONFLICT" } });
    await asPlayer.mutation(api.messages.roll, {
      campaignId,
      seed: await seedOf(t, campaignId),
      dice: ["blue"],
    });
    expect((await messagesOf(t, campaignId)).map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(await sequenceOf(t, campaignId)).toBe(2);
  });
});

describe("messages.latest", () => {
  test("is null before any message", async () => {
    const { asPlayer, campaignId } = await setup();
    expect(await asPlayer.query(api.messages.latest, { campaignId, kind: "roll" })).toBeNull();
    expect(await asPlayer.query(api.messages.latest, { campaignId, kind: "all" })).toBeNull();
  });

  test("returns the newest message of the kind, or of any kind, with who sent it", async () => {
    const { t, asGm, asPlayer, campaignId, seed } = await setup();
    await asGm.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] });
    const next = await seedOf(t, campaignId);
    await asPlayer.mutation(api.messages.roll, {
      campaignId,
      seed: next,
      dice: ["orange", "violet"],
    });
    const newest = {
      kind: "roll",
      sequence: 2,
      seed: next,
      dice: ["orange", "violet"],
      author: { displayName: "Pat", picture: "https://cdn.example/auth-player.png" },
    };
    expect(await asGm.query(api.messages.latest, { campaignId, kind: "roll" })).toMatchObject(
      newest,
    );
    expect(await asGm.query(api.messages.latest, { campaignId, kind: "all" })).toMatchObject(
      newest,
    );
  });

  test("reads as null for a non-member or a malformed id", async () => {
    const { asGm, asOutsider, campaignId, seed } = await setup();
    await asGm.mutation(api.messages.roll, { campaignId, seed, dice: ["blue"] });
    expect(await asOutsider.query(api.messages.latest, { campaignId, kind: "roll" })).toBeNull();
    expect(
      await asGm.query(api.messages.latest, { campaignId: "nonsense", kind: "all" }),
    ).toBeNull();
  });
});
