// ./amplify/data/resource.ts
import { a, type ClientSchema, defineData } from "@aws-amplify/backend";

import { searchPlayers } from "../functions/search-players/resource";
import { syncCampaignMembers } from "../functions/sync-campaign-members/resource";
import { syncCampaignProfiles } from "../functions/sync-campaign-profiles/resource";

const schema = a
  .schema({
    Campaign: a
      .model({
        name: a.string().required(),
        members: a.string().array(),
        characters: a.hasMany("Character", "campaignId"),
        profiles: a.hasMany("CampaignMember", "campaignId"),
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
        userProfileId: a.id(),
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
        characters: a.hasMany("Character", "userProfileId"),
        campaigns: a.hasMany("CampaignMember", "userProfileId"),
      })
      .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

    // Campaign <-> UserProfile join rows, managed exclusively by
    // sync-campaign-profiles; members (campaign owner included) is copied from
    // the campaign each time the lambda rewrites the rows.
    CampaignMember: a
      .model({
        campaignId: a.id().required(),
        campaign: a.belongsTo("Campaign", "campaignId"),
        userProfileId: a.id().required(),
        userProfile: a.belongsTo("UserProfile", "userProfileId"),
        members: a.string().array(),
      })
      .authorization((allow) => [allow.ownersDefinedIn("members").to(["read"])]),

    PlayerSearchResult: a.customType({
      id: a.id().required(),
      name: a.string(),
      picture: a.string(),
      isMember: a.boolean().required(),
    }),

    // UserProfiles whose names contain `search` (case-insensitive), flagging
    // those already in the campaign; callable only by the campaign's members.
    searchPlayers: a
      .query()
      .arguments({ campaignId: a.id().required(), search: a.string().required() })
      .returns(a.ref("PlayerSearchResult").array())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(searchPlayers)),
  })
  .authorization((allow) => [
    allow.resource(syncCampaignMembers),
    allow.resource(syncCampaignProfiles),
    allow.resource(searchPlayers),
  ]);

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
