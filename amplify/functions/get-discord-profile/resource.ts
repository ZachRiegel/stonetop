import { defineFunction, secret } from "@aws-amplify/backend";

export const getDiscordProfile = defineFunction({
  name: "get-discord-profile",
  resourceGroupName: "data",
  environment: { DISCORD_BOT_TOKEN: secret("discordBotToken") },
});
