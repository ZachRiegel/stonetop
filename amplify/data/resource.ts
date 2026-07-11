// ./amplify/data/resource.ts
import { a, type ClientSchema, defineData } from "@aws-amplify/backend";

import { getDiscordProfile } from "../functions/get-discord-profile/resource";
import { redeemInviteLink } from "../functions/redeem-invite-link/resource";
import { regenerateInviteLink } from "../functions/regenerate-invite-link/resource";
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
        inviteLinks: a.hasMany("InviteLink", "campaignId"),
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
        displayName: a.string(),
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

    // One active invite link per campaign; the id doubles as the URL token.
    // Rows are written only by lambdas (sync-campaign-profiles creates,
    // regenerate-invite-link rotates), so client failures can't strand a
    // campaign without a link and forged rows can't be created; the GM
    // (owner) can only read theirs.
    InviteLink: a
      .model({
        campaignId: a.id().required(),
        campaign: a.belongsTo("Campaign", "campaignId"),
        // declared explicitly because the read-only owner rule below would
        // otherwise drop the implicit owner field from CreateInviteLinkInput,
        // and the lambdas must set it so the GM can read their links
        owner: a.string(),
      })
      .authorization((allow) => [allow.owner().to(["read"])]),

    // The caller's Discord display name (global_name), looked up by the
    // snowflake embedded in their Cognito username; null for email-login
    // users and Discord users who never set one.
    getDiscordProfile: a
      .query()
      .returns(a.string())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(getDiscordProfile)),

    // Adds the caller to the linked campaign (outside their normal auth
    // perms) and returns the campaignId to redirect to.
    redeemInviteLink: a
      .mutation()
      .arguments({ inviteLinkId: a.id().required() })
      .returns(a.id())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(redeemInviteLink)),

    // Rotates the campaign's invite link (delete old + create new) server-side
    // so a client failure can't leave the campaign linkless; GM-only. Returns
    // the new link id.
    regenerateInviteLink: a
      .mutation()
      .arguments({ campaignId: a.id().required() })
      .returns(a.id())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(regenerateInviteLink)),
  })
  .authorization((allow) => [
    allow.resource(syncCampaignMembers),
    allow.resource(syncCampaignProfiles),
    allow.resource(redeemInviteLink),
    allow.resource(regenerateInviteLink),
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
