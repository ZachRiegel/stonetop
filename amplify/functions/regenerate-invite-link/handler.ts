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

const listInviteLinks = async (
  campaignId: string,
  nextToken?: string | null,
): Promise<Schema["InviteLink"]["type"][]> => {
  const { data, nextToken: token } = await client.models.InviteLink.list({
    filter: { campaignId: { eq: campaignId } },
    nextToken,
  });
  return token ? [...data, ...(await listInviteLinks(campaignId, token))] : data;
};

export const handler: Schema["regenerateInviteLink"]["functionHandler"] = async (event) => {
  const caller = (event.identity as AppSyncIdentityCognito | null)?.username;
  if (!caller) throw new Error("You must be signed in");

  const { data: campaign } = await client.models.Campaign.get({ id: event.arguments.campaignId });
  if (!campaign?.owner || toUsername(campaign.owner) !== caller) {
    throw new Error("Only the Game Master may manage invite links");
  }

  // delete first so the old URL is dead before its replacement exists;
  // deleting all rows self-heals any accidental duplicates
  const existing = await listInviteLinks(campaign.id);
  await Promise.all(existing.map(({ id }) => client.models.InviteLink.delete({ id })));

  const { data: link, errors } = await client.models.InviteLink.create({
    campaignId: campaign.id,
    owner: campaign.owner,
  });
  if (!link || errors?.length) throw new Error("Could not create invite link");
  return link.id;
};
