// What the pages say about a campaign card (convex/campaigns.ts): the caller's part in it,
// the other people, and the woodcut that stands for it.
import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import landscape from "pages/campaigns/footer.png";
import gear from "pages/campaigns/misc.png";
import stones from "pages/landing/footer.png";

export type CampaignCard = NonNullable<FunctionReturnType<typeof api.campaigns.get>>;

// "Game Master", or the caller's character
export const roleOf = (campaign: Pick<CampaignCard, "isOwner" | "myCharacter">) =>
  campaign.isOwner ? "Game Master" : (campaign.myCharacter?.name ?? "No character yet");

// everyone but the caller (null or undefined while the caller is unknown), for a card's faces
// and names
export const othersOf = (campaign: Pick<CampaignCard, "members">, me?: { _id: string } | null) =>
  campaign.members.filter((member) => member._id !== me?._id);

export const facesOf = (members: CampaignCard["members"]) =>
  members.map((member) => ({ key: member._id, src: member.picture, alt: member.displayName }));

// "1 player", "2 players"; `many` for an irregular plural
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// a campaign has no picture of its own yet, so one of three woodcuts stands for it, chosen by
// its id so a campaign keeps its picture from page to page
const ARTS = [landscape, stones, gear];
export const artOf = (campaignId: string) =>
  ARTS[[...campaignId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % ARTS.length] ??
  landscape;
