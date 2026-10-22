import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import Loading from "components/Loading.tsx";
import Poster from "components/Poster.tsx";
import PosterWall, { GROUND } from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import playbooksPng from "icons/playbooks.png";
import treePng from "icons/tree.png";
import { count, facesOf, othersOf, roleOf } from "pages/campaigns/card.ts";
import desk from "pages/campaigns/maps.png";
import stones from "pages/landing/footer.png";
import { useParams } from "react-router";

// A campaign's overview: its four sections on the staggered wall (components/PosterWall.tsx),
// the table tall at the top left over the character, the players short at the top right over
// the rules, so the page reads apart from the home bento (user, 2026-10-21; the players took
// the short box so as not to lead). The boxes are fixed; what the campaign needs next is lit,
// not moved: the players poster for a Game Master with no players yet, the character poster
// for a player without a character (three posters reordered by need came before). The table
// says who rolled last. Behind them the standing stones, the sharpest woodcut there is (user,
// 2026-10-19: the campaign's own pick was too low a resolution for a hero).
//
// Until the campaign and the caller are known the wall is the hourglass on the ground, not
// the posters, so the captions and the light do not snap in as the campaign arrives (user,
// 2026-10-21). The last roll is not waited for; its poster only reads differently.
const Centred = styled.div`
  ${GROUND}
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
`;

const Overview = () => {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const me = useQuery(api.users.me);
  const latest = useQuery(api.messages.latest, { campaignId, kind: "roll" });
  const isLoading = useMinimumLoading(campaign === undefined || me === undefined);
  if (isLoading || campaign === undefined || me === undefined) {
    return (
      <Centred>
        <Loading.Medium />
      </Centred>
    );
  }
  if (campaign === null) {
    return (
      <Centred>
        <Font.Italic16 element="div" text="There is no such campaign, or you are not in it." />
      </Centred>
    );
  }
  const others = othersOf(campaign, me);
  // the Game Master alone in the campaign; a player counts the Game Master as company
  const alone = campaign.isOwner && others.length === 0;
  return (
    <PosterWall hero={stones} staggered>
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
        suggested={!campaign.isOwner && campaign.myCharacter === null}
        art={playbooksPng}
        fit="icon"
        title="Character"
        caption={roleOf(campaign.isOwner, campaign.myCharacter)}
      />
      <Poster
        to={`/campaign/${campaignId}/players`}
        paper="green"
        suggested={alone}
        art={treePng}
        fit="icon"
        title="Players"
        caption={
          alone
            ? "Just you so far: invite them"
            : count(campaign.members.filter((member) => !member.isOwner).length, "player")
        }
        people={facesOf(others)}
      />
      <Poster
        to={`/campaign/${campaignId}/rules`}
        paper="orange"
        art={playbooksPng}
        fit="icon"
        title="Rules"
        caption="Playbooks, moves and the village"
      />
    </PosterWall>
  );
};

export default Overview;
