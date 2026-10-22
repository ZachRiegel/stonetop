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
import { count, othersOf, roleOf } from "pages/campaigns/card.ts";
import desk from "pages/campaigns/maps.png";
import stones from "pages/landing/footer.png";
import { useParams } from "react-router";

// A campaign's overview: three posters, the first the largest, put forward by what the
// campaign needs next (user, 2026-10-20). The table says who rolled last; the character
// poster names the caller's character. A Game Master with no players yet gets the players
// poster, in green, as the main one, its rim lit as the thing to do; once there are players
// it gives way to a rules poster in orange. A player without a character gets the character
// poster as the main one, its rim lit. Otherwise the table leads, unlit: the light marks a
// poster promoted past the wall's usual order, never the usual lead (user, 2026-10-21).
// Behind them the standing stones, the sharpest woodcut there is (user, 2026-10-19: the
// campaign's own pick was too low a resolution for a hero).
//
// Until the campaign and the caller are known the wall is the hourglass on the ground, not
// the posters: drawn before the data, the table led and the wall snapped to the players
// poster as the campaign arrived (user, 2026-10-21). The last roll is not waited for; its
// poster only reads differently.
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
  const needsCharacter = !campaign.isOwner && campaign.myCharacter === null;
  // each poster once, as markup, and the wall's order written out per case (user, 2026-10-21:
  // an array of posters picked by index read clunky next to plain markup)
  const table = (
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
  );
  const character = (
    <Poster
      to={`/campaign/${campaignId}/character`}
      paper="purple"
      suggested={needsCharacter}
      art={playbooksPng}
      fit="icon"
      title="Character"
      caption={roleOf(campaign.isOwner, campaign.myCharacter)}
    />
  );
  const rules = (
    <Poster
      to={`/campaign/${campaignId}/rules`}
      paper="orange"
      art={playbooksPng}
      fit="icon"
      title="Rules"
      caption="Playbooks, moves and the village"
    />
  );
  return (
    <PosterWall hero={stones}>
      {alone ? (
        <>
          <Poster
            to={`/campaign/${campaignId}/players`}
            paper="green"
            suggested
            art={treePng}
            fit="icon"
            title="Players"
            caption="Just you so far: invite them"
          />
          {table}
          {character}
        </>
      ) : needsCharacter ? (
        <>
          {character}
          {table}
          {rules}
        </>
      ) : (
        <>
          {table}
          {character}
          {rules}
        </>
      )}
    </PosterWall>
  );
};

export default Overview;
