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

// CampaignMember userProfileIds are Cognito usernames and include the owner
// (sync-campaign-profiles copies [owner, ...members] into the rows)
const listMemberIds = async (campaignId: string, nextToken?: string | null): Promise<string[]> => {
  const { data, nextToken: token } = await client.models.CampaignMember.list({
    filter: { campaignId: { eq: campaignId } },
    nextToken,
  });
  const ids = data.map((row) => row.userProfileId);
  return token ? [...ids, ...(await listMemberIds(campaignId, token))] : ids;
};

const listProfiles = async (
  nextToken?: string | null,
): Promise<Schema["UserProfile"]["type"][]> => {
  const { data, nextToken: token } = await client.models.UserProfile.list({ nextToken });
  return token ? [...data, ...(await listProfiles(token))] : data;
};

export const handler: Schema["searchPlayers"]["functionHandler"] = async (event) => {
  const term = event.arguments.search.trim().toLowerCase();
  if (term === "") return [];

  const memberIds = await listMemberIds(event.arguments.campaignId);

  // Results reveal campaign membership, so only members may search
  const caller = (event.identity as AppSyncIdentityCognito | null)?.username;
  if (!caller || !memberIds.includes(caller)) {
    throw new Error("Only campaign members may search for players");
  }

  // Matched in code rather than with a DB `contains` filter: the filter is
  // applied post-scan anyway and can't match case-insensitively
  return (await listProfiles())
    .filter(({ name }) => name?.toLowerCase().includes(term))
    .slice(0, 20)
    .map(({ id, name, picture }) => ({ id, name, picture, isMember: memberIds.includes(id) }));
};
