/// <reference types="vite/client" />
import { internal } from "_generated/api";
import { convexTest } from "convex-test";
import schema from "schema";
import { describe, expect, test } from "vitest";

const modules = import.meta.glob("./**/*.ts");

// The Better Auth component calls these internal mutations with the component
// document that changed; they keep the app-side `users` rows in step.
const authUser = {
  _id: "ba-user-1",
  _creationTime: 0,
  name: "Gwendolyn",
  email: "g@example.com",
  emailVerified: true,
  image: "https://cdn.discordapp.com/avatars/1/abc.png",
  createdAt: 0,
  updatedAt: 0,
};

const users = (t: ReturnType<typeof convexTest>) => t.run((ctx) => ctx.db.query("users").collect());

describe("auth triggers", () => {
  test("user.onCreate inserts a profile with the Discord name and avatar", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onCreate, { model: "user", doc: authUser });
    expect(await users(t)).toMatchObject([
      { authId: "ba-user-1", displayName: "Gwendolyn", picture: authUser.image },
    ]);
  });

  test("a user without an image gets Discord's default avatar", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onCreate, { model: "user", doc: { ...authUser, image: null } });
    expect(await users(t)).toMatchObject([
      { picture: "https://cdn.discordapp.com/embed/avatars/0.png" },
    ]);
  });

  test("user.onUpdate mirrors a changed name and avatar", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onCreate, { model: "user", doc: authUser });
    await t.mutation(internal.auth.onUpdate, {
      model: "user",
      oldDoc: authUser,
      newDoc: { ...authUser, name: "Gwen", image: "https://cdn.discordapp.com/avatars/1/new.png" },
    });
    expect(await users(t)).toMatchObject([
      { displayName: "Gwen", picture: "https://cdn.discordapp.com/avatars/1/new.png" },
    ]);
  });

  test("a sign-in that updates a user whose profile is missing recreates it", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onUpdate, { model: "user", oldDoc: authUser, newDoc: authUser });
    expect(await users(t)).toMatchObject([
      { authId: "ba-user-1", displayName: "Gwendolyn", picture: authUser.image },
    ]);
  });

  test("a repeated onCreate patches the existing profile instead of duplicating it", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onCreate, { model: "user", doc: authUser });
    await t.mutation(internal.auth.onCreate, { model: "user", doc: { ...authUser, name: "Gwen" } });
    expect(await users(t)).toMatchObject([{ displayName: "Gwen" }]);
  });

  test("user.onDelete removes the profile, and is a no-op without one", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.auth.onCreate, { model: "user", doc: authUser });
    await t.mutation(internal.auth.onDelete, { model: "user", doc: authUser });
    expect(await users(t)).toEqual([]);
    await t.mutation(internal.auth.onDelete, { model: "user", doc: authUser });
    expect(await users(t)).toEqual([]);
  });
});
