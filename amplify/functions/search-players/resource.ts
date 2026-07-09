import { defineFunction } from "@aws-amplify/backend";

export const searchPlayers = defineFunction({
  name: "search-players",
  resourceGroupName: "data",
});
