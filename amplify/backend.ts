import { defineBackend } from "@aws-amplify/backend";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { syncCampaignMembers } from "./functions/sync-campaign-members/resource";

const backend = defineBackend({
  auth,
  data,
  syncCampaignMembers,
});

backend.syncCampaignMembers.resources.lambda.addEventSource(
  new DynamoEventSource(backend.data.resources.tables["Campaign"]!, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 2,
  }),
);
