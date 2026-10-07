import betterAuth from "@convex-dev/better-auth/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

// Declared here so `env` from ./_generated/server is typed and a deployment
// missing one of these fails at deploy time, not at first sign-in.
// BETTER_AUTH_SECRET is read from process.env by better-auth itself.
const app = defineApp({
  env: {
    SITE_URL: v.string(),
    DISCORD_CLIENT_ID: v.string(),
    DISCORD_CLIENT_SECRET: v.string(),
    BETTER_AUTH_SECRET: v.string(),
  },
});
app.use(betterAuth);

export default app;
