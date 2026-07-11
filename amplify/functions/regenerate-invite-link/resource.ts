import { defineFunction } from "@aws-amplify/backend";

export const regenerateInviteLink = defineFunction({
  name: "regenerate-invite-link",
  resourceGroupName: "data",
});
