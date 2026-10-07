import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import type { GenericMutationCtx } from "convex/server";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import authConfig from "./auth.config";

const authFunctions: AuthFunctions = internal.auth;

const userByAuthId = (ctx: GenericMutationCtx<DataModel>, authId: string) =>
  ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();

// Better Auth's Discord provider sets name to the global name (falling back
// to the username) and image to the avatar URL, Discord's default avatar
// included when the user has none; the fallback here only satisfies the type
const profileOf = ({ name, image }: { name: string; image?: string | null }) => ({
  displayName: name,
  picture: image ?? "https://cdn.discordapp.com/embed/avatars/0.png",
});

// The app-side profile row for a Better Auth user: patched when it exists and
// created otherwise, so every sign-in leaves exactly one
const upsertUser = async (
  ctx: GenericMutationCtx<DataModel>,
  authUser: { _id: string; name: string; image?: string | null },
) => {
  const user = await userByAuthId(ctx, authUser._id);
  if (user) await ctx.db.patch(user._id, profileOf(authUser));
  else await ctx.db.insert("users", { authId: authUser._id, ...profileOf(authUser) });
};

// Triggers run inside the component's own transaction, so a Better Auth user
// never exists without a profile row
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: upsertUser,
      onUpdate: upsertUser,
      onDelete: async (ctx, authUser) => {
        const user = await userByAuthId(ctx, authUser._id);
        if (user) await ctx.db.delete(user._id);
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: env.CONVEX_SITE_URL,
    // the app's origin: cross-domain sign-in returns here, and only this
    // origin may call the auth routes
    trustedOrigins: [env.SITE_URL],
    database: authComponent.adapter(ctx),
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        // re-copy name and avatar from Discord on every sign-in (the default
        // freezes them at first login); user.onUpdate mirrors the change
        overrideUserInfoOnSignIn: true,
      },
    },
    // Discord is the only source of profile data: Better Auth's self-service
    // update-user route would let anyone pick a name and avatar
    disabledPaths: ["/update-user"],
    plugins: [
      // the app runs on a different origin than the auth routes
      crossDomain({ siteUrl: env.SITE_URL }),
      convex({ authConfig }),
    ],
  });
