// ./amplify/data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

import { syncCampaignMembers } from "../functions/sync-campaign-members/resource";

const schema = a
  .schema({
    Campaign: a
      .model({
        name: a.string().required(),
        members: a.string().array(),
        characters: a.hasMany("Character", "campaignId"),
      })
      .authorization((allow) => [allow.owner(), allow.ownersDefinedIn("members").to(["read"])]),

    Character: a
      .model({
        name: a.string().required(),
        class: a.enum([
          "BLESSED",
          "FOX",
          "HEAVY",
          "JUDGE",
          "LIGHTBEARER",
          "MARSHAL",
          "RANGER",
          "SEEKER",
          "WOULD_BE_HERO",
        ]),
        level: a.integer().required(),
        campaignId: a.id().required(),
        campaign: a.belongsTo("Campaign", "campaignId"),
        user: a.belongsTo("UserProfile", "userProfileId"),
        // copied from the campaign at creation time; must be re-synced if they change
        campaignOwner: a.string(),
        members: a.string().array(),
      })
      .authorization((allow) => [
        allow.owner(),
        allow.ownerDefinedIn("campaignOwner"),
        allow.ownersDefinedIn("members").to(["read"]),
      ]),
    // Cognito attributes (e.g. the IdP profile photo) are only readable by the
    // signed-in user, so each user mirrors theirs here on login; the record id
    // is the Cognito username, matching Campaign.owner / Campaign.members.
    UserProfile: a
      .model({
        name: a.string(),
        picture: a.string(),
        characters: a.hasMany("Character", "characterId"),
      })
      .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),
  })
  .authorization((allow) => [allow.resource(syncCampaignMembers)]);

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
