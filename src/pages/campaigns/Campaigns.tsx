import styled from "@emotion/styled";
import Font, { TITLE_CAPS } from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Loading from "components/Loading.tsx";
import Poster from "components/Poster.tsx";
import { GROUND } from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import useModal from "hooks/useModal.ts";
import { MEDIA } from "hooks/useResponsiveSize.ts";
import { artOf, count, facesOf, othersOf, roleOf } from "pages/campaigns/card.ts";
import CreateCampaignDialog from "pages/campaigns/CreateCampaignModal.tsx";
import landscape from "pages/campaigns/footer.png";
import { useSearchParams } from "react-router";

const Page = styled.div`
  ${GROUND}
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// the landscape screened over the whole page behind the cards, dimmed well down and faded
// in under the strip; its own image rather than the wall's hero, whose box cropped the wide
// woodcut to its right third (user, 2026-10-19). Blends onto the page's GROUND.
const Hero = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: screen;
  opacity: 0.3;
  pointer-events: none;
  mask-image: linear-gradient(transparent, #000 20%);
`;

const Notice = styled(Font.Italic16)`
  position: absolute;
  z-index: 2;
  top: 12px;
  left: 16px;
  right: 16px;
  text-align: center;
`;

// One row of campaigns in slate, colour being kept for the home wall. On a desktop wide,
// short cards from the page's left gutter (user, 2026-10-19; centred came first), scrolling
// sideways once they outgrow it; on a phone a row that scrolls sideways and snaps card to
// card, a 4px spacer and the 12px gap putting the first and last cards 16px from the edges,
// where the scroll padding snaps them. Flex on the phone for those spacers: a scroller's
// trailing padding is not reliably scrollable.
const Row = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 16px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
  &::before,
  &::after {
    content: "";
    flex: 0 0 4px;
  }
  /* rounder than the walls' posters; the slate paper itself cuts them out of the landscape */
  & > * {
    flex: 0 0 76%;
    height: 300px;
    scroll-snap-align: center;
    --poster-title: 22px;
    --poster-radius: 12px;
  }

  @media ${MEDIA.desktop} {
    display: grid;
    grid-auto-flow: column;
    /* 250 by 320 at 1280 wide, scaling with the page from a phone's card up (user: the cards
       should scale with the screen) */
    grid-auto-columns: clamp(220px, 19.5vw, 520px);
    grid-template-rows: clamp(280px, 25vw, 665px);
    justify-content: start;
    align-content: center;
    align-items: stretch;
    gap: 16px;
    padding: 0 36px;
    scroll-snap-type: none;

    &::before,
    &::after {
      content: none;
    }
    & > * {
      height: auto;
      --poster-title: clamp(18px, 1.7vw, 44px);
    }
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

// a cream pill at the page's bottom right, the one light thing on the page; sized in ems so
// it scales with its type, 13px at 1280 wide and gently up with the screen on a desktop
// (user, 2026-10-19: 24px on a wide screen was too large)
const NewButton = styled.button`
  ${TITLE_CAPS}
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 24px;
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  column-gap: 0.4em;
  padding: 0.7em 1.5em 0.7em 1em;
  border: none;
  border-radius: 999px;
  background: var(--cream);
  color: var(--neutral-0);
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  box-shadow: var(--shadow-medium);
  cursor: pointer;
  --icon-size: 1.7em;
  transition: background 120ms linear;

  &:hover {
    background: var(--white);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }

  @media ${MEDIA.desktop} {
    right: clamp(36px, 2.8vw, 72px);
    bottom: clamp(28px, 2.2vw, 56px);
    font-size: clamp(13px, 0.75vw, 18px);
  }
`;

const Campaigns = () => {
  const campaigns = useQuery(api.campaigns.list);
  const me = useQuery(api.users.me);
  const createModal = useModal();
  const [searchParams] = useSearchParams();
  const isLoading = useMinimumLoading(!campaigns);

  return (
    <Page>
      {searchParams.get("invite") === "invalid" && (
        <Notice
          element="div"
          text="That invite link is no longer valid. Ask your Game Master for a new one."
        />
      )}
      {isLoading || !campaigns ? (
        <Centred>
          <Loading.Medium />
        </Centred>
      ) : campaigns.length === 0 ? (
        <Centred>
          <Font.Italic16
            element="div"
            text={`You aren't a member of any campaigns yet.
Ask your Game Master to invite you or create one.`}
          />
        </Centred>
      ) : (
        <Row>
          {campaigns.map((campaign) => {
            const others = othersOf(campaign, me);
            return (
              <Poster
                key={campaign._id}
                to={`/campaign/${campaign._id}`}
                paper="slate"
                art={artOf(campaign._id)}
                title={campaign.name}
                caption={`${roleOf(campaign)} · ${count(others.length, campaign.isOwner ? "player" : "other")}`}
                people={facesOf(others)}
              />
            );
          })}
        </Row>
      )}
      <NewButton onClick={createModal.open}>
        <Icon.Plus />
        New campaign
      </NewButton>
      <Hero src={landscape} alt="" />
      <CreateCampaignDialog isOpen={createModal.isOpen} requestClose={createModal.close} />
    </Page>
  );
};

export default Campaigns;
