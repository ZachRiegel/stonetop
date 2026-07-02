// ./amplify/data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  TestingTable: a
    .model({
      content: a.string().required(),
    })
    .authorization((allow) => [allow.owner()]),

  Campaign: a
    .model({
      name: a.string().required(),
      members: a.string().array(),
    })
    .authorization((allow) => [allow.ownersDefinedIn("members")]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
