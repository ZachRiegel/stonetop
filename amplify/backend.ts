import { defineBackend } from "@aws-amplify/backend";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { getDiscordProfile } from "./functions/get-discord-profile/resource";
import { redeemInviteLink } from "./functions/redeem-invite-link/resource";
import { regenerateInviteLink } from "./functions/regenerate-invite-link/resource";
import { syncCampaignMembers } from "./functions/sync-campaign-members/resource";
import { syncCampaignProfiles } from "./functions/sync-campaign-profiles/resource";

const backend = defineBackend({
  auth,
  data,
  getDiscordProfile,
  redeemInviteLink,
  regenerateInviteLink,
  syncCampaignMembers,
  syncCampaignProfiles,
});

[backend.syncCampaignMembers, backend.syncCampaignProfiles].map(({ resources }) =>
  resources.lambda.addEventSource(
    new DynamoEventSource(backend.data.resources.tables["Campaign"]!, {
      startingPosition: StartingPosition.LATEST,
      batchSize: 10,
      retryAttempts: 2,
    }),
  ),
);
