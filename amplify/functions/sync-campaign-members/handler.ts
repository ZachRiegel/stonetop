import process from "node:process";

import type { DynamoDBStreamHandler } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";

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

const authFields = ({ owner, members }: CampaignImage) =>
  JSON.stringify([owner, members]);

const listCharacters = async (
  campaignId: string,
  nextToken?: string | null,
): Promise<Schema["Character"]["type"][]> => {
  const { data, nextToken: token } = await client.models.Character.list({
    filter: { campaignId: { eq: campaignId } },
    nextToken,
  });
  return token ? [...data, ...(await listCharacters(campaignId, token))] : data;
};

export const handler: DynamoDBStreamHandler = async (event) => {
  const changed = event.Records.flatMap((record) =>
    record.eventName === "MODIFY" &&
    record.dynamodb?.OldImage &&
    record.dynamodb?.NewImage
      ? [
          {
            before: toCampaign(record.dynamodb.OldImage),
            after: toCampaign(record.dynamodb.NewImage),
          },
        ]
      : [],
  ).filter(({ before, after }) => authFields(before) !== authFields(after));

  await Promise.all(
    changed.map(async ({ after }) => {
      const characters = await listCharacters(after.id);
      await Promise.all(
        characters.map(({ id }) =>
          client.models.Character.update({
            id,
            campaignOwner: after.owner ?? null,
            members: after.members ?? [],
          }),
        ),
      );
    }),
  );
};
