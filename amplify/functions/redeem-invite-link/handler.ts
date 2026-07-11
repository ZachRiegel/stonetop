import process from "node:process";

import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { AppSyncIdentityCognito } from "aws-lambda";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as unknown as Parameters<typeof getAmplifyDataClientConfig>[0],
);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

// owner fields normally read back as plain usernames, but raw rows store
// "<sub>::<username>"; normalize so the comparison can't be fooled either way
const toUsername = (value: string) => value.split("::").pop() as string;

export const handler: Schema["redeemInviteLink"]["functionHandler"] = async (event) => {
  const caller = (event.identity as AppSyncIdentityCognito | null)?.username;
  if (!caller) throw new Error("You must be signed in to redeem an invite link");

  const { data: link } = await client.models.InviteLink.get({
    id: event.arguments.inviteLinkId,
  });
  if (!link?.owner) throw new Error("This invite link is invalid or has expired");

  const { data: campaign } = await client.models.Campaign.get({ id: link.campaignId });
  // anyone can create an InviteLink row pointing at any campaignId, so only
  // honor links created by the campaign's own GM
  if (!campaign?.owner || toUsername(link.owner) !== toUsername(campaign.owner)) {
    throw new Error("This invite link is invalid or has expired");
  }

  const members = (campaign.members ?? []).filter((member): member is string => Boolean(member));
  // the GM and existing members no-op to success, so re-clicked links still
  // land the caller in the campaign
  if (toUsername(campaign.owner) !== caller && !members.map(toUsername).includes(caller)) {
    const { errors } = await client.models.Campaign.update({
      id: campaign.id,
      members: [...members, caller],
    });
    if (errors?.length) throw new Error("Could not join the campaign");
  }
  return campaign.id;
};
