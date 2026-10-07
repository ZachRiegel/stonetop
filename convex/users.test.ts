/// <reference types="vite/client" />
import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const seedUser = (t: ReturnType<typeof convexTest>, authId: string, displayName: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", { authId, displayName, picture: `https://cdn.example/${authId}.png` }),
  );

describe("users.me", () => {
  test("throws when signed out", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "auth-gm", "Gwendolyn");
    await expect(t.query(api.users.me)).rejects.toThrow("UNAUTHENTICATED");
  });

  test("returns the profile whose authId is the JWT subject", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, "auth-other", "Olive");
    const userId = await seedUser(t, "auth-gm", "Gwendolyn");
    expect(await t.withIdentity({ subject: "auth-gm" }).query(api.users.me)).toEqual({
      _id: userId,
      _creationTime: expect.any(Number),
      authId: "auth-gm",
      displayName: "Gwendolyn",
      picture: "https://cdn.example/auth-gm.png",
    });
  });

  // A session can outlive its profile row (the account was deleted); the
  // client recognises this ConvexError by its code and signs out
  test("throws a ConvexError the client can act on for a session with no profile row", async () => {
    const t = convexTest(schema, modules);
    const error = await t
      .withIdentity({ subject: "auth-stranger" })
      .query(api.users.me)
      .catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ConvexError);
    expect(error).toMatchObject({ data: { code: "UNAUTHENTICATED" } });
  });
});
