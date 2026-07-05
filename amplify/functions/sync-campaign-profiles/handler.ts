import process from "node:process";

import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { DynamoDBRecord, DynamoDBStreamHandler } from "aws-lambda";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as unknown as Parameters<typeof getAmplifyDataClientConfig>[0],
);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

type CampaignImage = {
  id: string;
  owner?: string;
  members?: string[];
};

const toCampaign = (image: unknown) =>
  unmarshall(image as Parameters<typeof unmarshall>[0]) as CampaignImage;

// raw stream images store owner as "<sub>::<username>" (GraphQL strips the
// prefix on read); UserProfile ids are plain usernames
const toProfileId = (value: string) => value.split("::").pop() as string;

// owner + members, deduped; entries resolve to Cognito usernames, i.e. UserProfile ids
const memberIds = ({ owner, members }: CampaignImage) => [
  ...new Set(
    [owner, ...(members ?? [])].filter((id): id is string => Boolean(id)).map(toProfileId),
  ),
];

const membersChanged = (before: CampaignImage, after: CampaignImage) =>
  JSON.stringify(memberIds(before)) !== JSON.stringify(memberIds(after));

const toChange = ({ eventName, dynamodb }: DynamoDBRecord) => {
  const before = dynamodb?.OldImage && toCampaign(dynamodb.OldImage);
  const after = dynamodb?.NewImage && toCampaign(dynamodb.NewImage);
  return eventName === "REMOVE" && before
    ? [{ campaign: before, desired: [] as string[] }]
    : eventName === "INSERT" && after
      ? [{ campaign: after, desired: memberIds(after) }]
      : eventName === "MODIFY" && before && after && membersChanged(before, after)
        ? [{ campaign: after, desired: memberIds(after) }]
        : [];
};

const listMemberRows = async (
  campaignId: string,
  nextToken?: string | null,
): Promise<Schema["CampaignMember"]["type"][]> => {
  const { data, nextToken: token } = await client.models.CampaignMember.list({
    filter: { campaignId: { eq: campaignId } },
    nextToken,
  });
  return token ? [...data, ...(await listMemberRows(campaignId, token))] : data;
};

const reconcile = async (campaign: CampaignImage, desired: string[]) => {
  const existing = await listMemberRows(campaign.id);
  const byProfile = new Map(existing.map((row) => [row.userProfileId, row]));
  // desired is the deduped [owner, ...members] username list, so the owner is
  // always covered by the single members auth rule
  const authFields = { members: desired };

  await Promise.all([
    ...desired
      .filter((id) => !byProfile.has(id))
      .map((userProfileId) =>
        client.models.CampaignMember.create({
          campaignId: campaign.id,
          userProfileId,
          ...authFields,
        }),
      ),
    ...existing
      .filter(({ userProfileId }) => !desired.includes(userProfileId))
      .map(({ id }) => client.models.CampaignMember.delete({ id })),
    // surviving rows carry auth fields copied from a campaign that just changed
    ...existing
      .filter(({ userProfileId }) => desired.includes(userProfileId))
      .map(({ id }) => client.models.CampaignMember.update({ id, ...authFields })),
  ]);
};

export const handler: DynamoDBStreamHandler = async (event) => {
  // stream records for a key arrive in order, so the last change per campaign wins
  const latest = [
    ...new Map(
      event.Records.flatMap(toChange).map((change) => [change.campaign.id, change]),
    ).values(),
  ];

  await Promise.all(latest.map(({ campaign, desired }) => reconcile(campaign, desired)));
};
