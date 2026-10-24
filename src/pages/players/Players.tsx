import styled from "@emotion/styled";
import Font, { EYEBROW, TITLE } from "components/Font.tsx";
import Loading from "components/Loading.tsx";
import { GROUND } from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import { MEDIA } from "hooks/useResponsiveSize.ts";
import treePng from "icons/tree.png";
import { type CampaignCard, roleOf } from "pages/campaigns/card.ts";
import InvitePlayers from "pages/players/InvitePlayers.tsx";
import { useParams } from "react-router";

// The campaign's members as a roster on the ground, "grouped cells" of the seven takes in
// src/holding/playersDrafts.html (user, 2026-10-21; navigation/README.md): no paper and no
// title, the strip's pill saying where you are; two small-caps heads, Game Master and Players
// with their count; the members as soft cells; the tree screened at the right; and the Game
// Master's invite as pills at the bottom right. A 360px card with a title, a 340px scroll of
// rows and two grey buttons was the page before, from the sidebar's day.
const Page = styled.div`
  ${GROUND}
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// the tree, the page's own mark (the Players tab's glyph and poster), faint and large at the
// right of a desktop and low at the right of a phone, under the rows
const Hero = styled.img`
  position: absolute;
  z-index: 0;
  inset: auto -60px -40px auto;
  width: 360px;
  height: 400px;
  object-fit: contain;
  object-position: right bottom;
  opacity: 0.18;
  pointer-events: none;
  mask-image: linear-gradient(#000 60%, transparent);

  @media ${MEDIA.desktop} {
    inset: auto -40px -60px auto;
    width: 560px;
    height: 620px;
    opacity: 0.22;
    mask-image:
      linear-gradient(90deg, transparent, #000 40%), linear-gradient(#000 70%, transparent);
    mask-composite: intersect;
  }
`;

const Centred = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  height: 100%;
  padding: 0 36px;
  text-align: center;
`;

// the roster from the left gutter, scrolling down once it outgrows the page, its foot clear
// of the invite pills' band; half the page on a desktop. Its scroll is the strip's `--page`
// timeline (navigation/Strip.tsx draws its foot by it).
const Roster = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  align-content: start;
  row-gap: 8px;
  height: 100%;
  overflow-y: auto;
  scroll-timeline: --page block;
  padding: 2px 16px 84px;

  @media ${MEDIA.desktop} {
    width: 50%;
    padding: 10px 36px 110px;
  }
`;

// a head in small caps, the strip's eyebrow a touch larger
const Head = styled.div`
  ${EYEBROW}
  padding: 14px 4px 2px;
  font-size: 11px;
  font-weight: 700;
  color: var(--neutral-500);

  &:first-of-type {
    padding-top: 4px;
  }
`;

// a member: a soft cell a shade up from the ground, rounded like the sheets, the face ringed
// in black like the faces on a poster beside the name over the part they play
const Cell = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 16px;
  align-items: center;
  padding: 12px 16px 12px 12px;
  border-radius: 12px;
  background-color: var(--neutral-75);
`;

const Face = styled.img`
  width: 48px;
  height: 48px;
  border: 2px solid rgb(0 0 0 / 0.6);
  border-radius: 999px;
  object-fit: cover;
`;

const Who = styled.div`
  display: grid;
  min-width: 0;
  line-height: 1.2;
`;

const Name = styled.div`
  ${TITLE}
  font-size: 20px;
  color: var(--cream);
  overflow-wrap: anywhere;
`;

const Part = styled(Font.Italic14)`
  color: var(--neutral-500);
`;

// the Game Master alone, under the empty Players head
const Note = styled(Font.Italic16)`
  padding: 6px 4px;
  color: var(--neutral-600);
`;

const Invite = styled(InvitePlayers)`
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 24px;

  @media ${MEDIA.desktop} {
    right: clamp(36px, 2.8vw, 72px);
    bottom: clamp(28px, 2.2vw, 56px);
  }
`;

// one member's cell, the same under either head
const cellOf = (member: CampaignCard["members"][number]) => (
  <Cell key={member._id}>
    <Face src={member.picture} alt="" />
    <Who>
      <Name>{member.displayName}</Name>
      <Part element="div" text={roleOf(member.isOwner, member.character)} />
    </Who>
  </Cell>
);

const Players = () => {
  const { campaignId = "" } = useParams();
  // null means the caller is not a member
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const isLoading = useMinimumLoading(campaign === undefined);
  const players = campaign?.members.filter((member) => !member.isOwner) ?? [];

  return (
    <Page>
      {isLoading || campaign === undefined ? (
        <Centred>
          <Loading.Medium />
        </Centred>
      ) : campaign === null ? (
        <Centred>
          <Font.Italic16 element="div" text="There is no such campaign, or you are not in it." />
        </Centred>
      ) : (
        <Roster>
          <Head>Game Master</Head>
          {campaign.members.filter((member) => member.isOwner).map(cellOf)}
          <Head>{`Players · ${players.length}`}</Head>
          {players.map(cellOf)}
          {campaign.isOwner && players.length === 0 && (
            <Note element="div" text="Just you so far: send your players the invite link." />
          )}
        </Roster>
      )}
      {campaign?.inviteToken && (
        <Invite campaignId={campaign._id} inviteToken={campaign.inviteToken} />
      )}
      <Hero src={treePng} alt="" />
    </Page>
  );
};

export default Players;
