/// <reference types="vite/client" />
// What the convex-test suites share: the modules, seeded users and members, and a campaign
// with its people. Its two dots keep Convex from deploying it as a function module.
import { api } from "_generated/api";
import type { Id } from "_generated/dataModel";
import { convexTest, type TestConvex } from "convex-test";
import schema from "schema";

export const modules = import.meta.glob("./**/*.ts");

export type T = TestConvex<typeof schema>;

// Profiles normally arrive through the Better Auth triggers; tests seed them
// directly and act as a user by presenting their authId as the JWT subject
export const seedUser = (t: T, authId: string, displayName: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", { authId, displayName, picture: `https://cdn.example/${authId}.png` }),
  );

export const seedMember = (t: T, campaignId: Id<"campaigns">, userId: Id<"users">) =>
  t.run((ctx) => ctx.db.insert("campaignMembers", { campaignId, userId, isOwner: false }));

// A Game Master running a campaign, a player already in it, and an outsider who is not
export const setup = async () => {
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
  };
};
