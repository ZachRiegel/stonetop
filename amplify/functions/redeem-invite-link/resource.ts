import { defineFunction } from "@aws-amplify/backend";

export const redeemInviteLink = defineFunction({
  name: "redeem-invite-link",
  resourceGroupName: "data",
});
