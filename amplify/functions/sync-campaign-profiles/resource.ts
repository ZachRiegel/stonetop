import { defineFunction } from "@aws-amplify/backend";

// Lives in the data stack (resourceGroupName) because the schema grants it
// data access while its event source reads the data stack's Campaign table —
// separate stacks would be circularly dependent.
export const syncCampaignProfiles = defineFunction({
  name: "sync-campaign-profiles",
  resourceGroupName: "data",
});
