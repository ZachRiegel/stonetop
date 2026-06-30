// ./amplify/auth/resource.ts
import { defineAuth, secret } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      oidc: [
        {
          name: "auth0",
          /**
           * Since in Amplify, the TypeScript definition of
           * clientId and clientSecret is BackendSecret,
           * we need to store the values in Amplify's secret manager.
           */
          clientId: secret("authClient"),
          clientSecret: secret("authSecret"),
          issuerUrl: "https://your-domain.jp.auth0.com",
          scopes: ["openid", "profile", "email", "name"],
        },
      ],
      logoutUrls: [
        "http://localhost:5173",
        // your staging / production domain later
      ],
      callbackUrls: [
        "http://localhost:5173",
        // your staging / production domain later
      ],
    },
  },
});
