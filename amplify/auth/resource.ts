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
          issuerUrl: "https://dev-upwpy2prgrn2zopf.us.auth0.com",
          scopes: ["openid", "profile", "email", "name"],
          attributeMapping: {
            custom: {
              name: "name",
              picture: "picture",
            },
          },
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
