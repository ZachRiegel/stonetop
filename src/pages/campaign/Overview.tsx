import Poster from "components/Poster.tsx";
import PosterWall from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import playbooksPng from "icons/playbooks.png";
import treePng from "icons/tree.png";
import { count, facesOf, othersOf, roleOf } from "pages/campaigns/card.ts";
import desk from "pages/campaigns/maps.png";
import stones from "pages/landing/footer.png";
import { useParams } from "react-router";

// A campaign's overview: its three sections as posters. The table is the main one and says
// who rolled last; the character poster names the caller's character and the players poster
// the other people. Behind them the standing stones, the sharpest woodcut there is (user,
// 2026-10-19: the campaign's own pick was too low a resolution for a hero).
const Overview = () => {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const me = useQuery(api.users.me);
  const latest = useQuery(api.messages.latest, { campaignId, kind: "roll" });
  const others = campaign ? othersOf(campaign, me) : [];
  return (
    <PosterWall hero={stones}>
      <Poster
        to={`/campaign/${campaignId}/dice`}
        paper="blue"
        art={desk}
        eyebrow="The table"
        title="Roll the dice"
        caption={
          latest
            ? `${latest.author.displayName} rolled ${count(latest.dice.length, "die", "dice")}`
            : "No rolls yet"
        }
      />
      <Poster
        to={`/campaign/${campaignId}/character`}
        paper="purple"
        art={playbooksPng}
        fit="icon"
        title="Character"
        caption={campaign ? roleOf(campaign.isOwner, campaign.myCharacter) : ""}
      />
      <Poster
        to={`/campaign/${campaignId}/players`}
        paper="orange"
        art={treePng}
        fit="icon"
        title="Players"
        caption={
          others.length ? others.map((member) => member.displayName).join(", ") : "Just you so far"
        }
        people={facesOf(others)}
      />
    </PosterWall>
  );
};

export default Overview;
