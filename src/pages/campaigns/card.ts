// What the pages say about a campaign card (convex/campaigns.ts): the caller's part in it,
// the other people, and the woodcut and paper that stand for it.
import type { Paper } from "components/Poster.tsx";
import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import landscape from "pages/campaigns/footer.png";
import gear from "pages/campaigns/misc.png";
import stones from "pages/landing/footer.png";

export type CampaignCard = NonNullable<FunctionReturnType<typeof api.campaigns.get>>;

// "Game Master", or the member's character
export const roleOf = (isOwner: boolean, character: { name: string } | null) =>
  isOwner ? "Game Master" : (character?.name ?? "No character yet");

// everyone but the caller (null or undefined while the caller is unknown), for a card's faces
// and names
export const othersOf = (campaign: Pick<CampaignCard, "members">, me?: { _id: string } | null) =>
  campaign.members.filter((member) => member._id !== me?._id);

export const facesOf = (members: CampaignCard["members"]) =>
  members.map((member) => ({ key: member._id, src: member.picture, alt: member.displayName }));

// "1 player", "2 players"; `many` for an irregular plural
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// a campaign has no picture or colour of its own yet, so one of three woodcuts and one of the
// four papers stand for it, picked from its id so it keeps them from page to page and from
// member to member (user, 2026-10-21: random per campaign rather than by its place in the
// row). The paper reads other bits of the hash than the art, so the two do not go together.
const hashOf = (id: string) =>
  [...id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
const ARTS = [landscape, stones, gear];
export const artOf = (campaignId: string) => ARTS[hashOf(campaignId) % ARTS.length] ?? landscape;
const PAPERS_OF_CAMPAIGNS: Paper[] = ["blue", "purple", "green", "orange"];
export const paperOf = (campaignId: string) =>
  PAPERS_OF_CAMPAIGNS[(hashOf(campaignId) >>> 8) % PAPERS_OF_CAMPAIGNS.length] ?? "blue";
