import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

// Tokens are minted by the Better Auth component running in this deployment;
// this tells Convex to trust them.
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
