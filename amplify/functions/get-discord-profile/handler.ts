import process from "node:process";

import type { AppSyncIdentityCognito } from "aws-lambda";

import type { Schema } from "../../data/resource";

export const handler: Schema["getDiscordProfile"]["functionHandler"] = async (event) => {
  // Usernames of Discord-federated users end in `discord|<snowflake>`
  const username = (event.identity as AppSyncIdentityCognito | null)?.username;
  if (!username?.match(/discord/)) return null;

  const response = await fetch(
    `https://discord.com/api/v10/users/${username.split(/\|/g).pop()}`,
    { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } },
  );
  // Failures throw so callers can tell them apart from a legitimately unset name
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);

  const { global_name }: { global_name?: string | null } = await response.json();
  return global_name ?? null;
};
