import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Loading from "components/Loading.tsx";
import Pill from "components/Pill.tsx";
import Poster from "components/Poster.tsx";
import { GROUND } from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import useModal from "hooks/useModal.ts";
import { MEDIA } from "hooks/useResponsiveSize.ts";
import { artOf, count, facesOf, othersOf, paperOf, roleOf } from "pages/campaigns/card.ts";
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

// the landscape screened over the whole page behind the cards and faded in under the strip:
// its own image rather than the wall's hero, whose box cropped the wide woodcut to its right
// third (user, 2026-10-19), and dimmed to weather rather than wallpaper (user, 2026-10-21: at
// 30% the cards were lost in it; a pool of black behind the row, from the chosen draft E of
// six in src/holding/campaignSelector.html, was tried and dropped as a shadow mid-page).
// Blends onto the page's GROUND.
const Hero = styled.img`
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: screen;
  opacity: 0.16;
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

// One row of campaigns on the posters' papers, each by its id. The cards are 17 wide to 28
// tall: 340 by 560 at 1280 wide, growing with a desktop to 520 by 856 (user, 2026-10-21: 250
// by 500 at every size was too small on a desktop, 2 to 4 sized from the row too big, and
// 340 by 560 in the draft's 1280 frame is the proportion kept), 285 by 470 on a phone (user,
// 2026-10-21: 237 by 390, 30% under, was a bit small), shorter only where the row less a
// margin is and never under 200px (a phone on its side), narrower only where a phone is. The
// row is a size container, so the cards are measured against it. On a desktop the cards start
// from the page's left gutter (user, 2026-10-19; centred came first) and scroll sideways once
// they outgrow it. On a phone the row snaps card to card against a 16px left gutter (user,
// 2026-10-21: centred, which came first that day, sat the card too far from the left); between
// the two the row snaps each card centred. 24px between cards (12px let the edges run together;
// the draft's 40px on a desktop was too loose).
const Row = styled.div`
  position: relative;
  z-index: 1;
  container-type: size;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  /* the cards keep above the New campaign pill's band at the foot */
  padding-bottom: 64px;
  --card-height: max(200px, min(100cqh - 48px, clamp(560px, 32.1vw, 856px)));

  &::-webkit-scrollbar {
    display: none;
  }
  /* rounder than the walls' posters, and lit: the hard black shadow under a small cream
     light (user, 2026-10-21: the draft's 56px was too much). The height holds where a phone
     caps the width, so a narrow phone's card runs a little taller than its ratio. */
  & > * {
    flex: 0 0 auto;
    height: var(--card-height);
    aspect-ratio: 17 / 28;
    max-width: calc(100cqw - 48px);
    scroll-snap-align: center;
    --lift: 0 0 28px rgb(from var(--cream) r g b / 0.13), 6px 6px 0 var(--neutral-0);
    --lift-hover: 0 0 40px rgb(from var(--cream) r g b / 0.2), 8px 8px 0 var(--neutral-0);
    --poster-padding: 20px;
    --poster-title: 28px;
    --poster-caption: 15px;
    --poster-radius: 12px;
  }
  /* the margins that centre the first and last cards in the row at rest, down to the gap
     where a phone caps the width; on the cards rather than the row, whose trailing padding
     is not reliably scrollable */
  & > :first-child {
    margin-left: max(24px, calc(50cqw - var(--card-height) * 17 / 56));
  }
  & > :last-child {
    margin-right: max(24px, calc(50cqw - var(--card-height) * 17 / 56));
  }

  /* a phone: the smaller cards, each snapped to the left gutter, centred in the whole row's
     height since the pill at the foot has room under them, with the words sized as the
     250-wide cards' were */
  @media ${MEDIA.mobile} {
    padding-bottom: 0;
    scroll-padding-left: 16px;
    --card-height: max(200px, min(100cqh - 48px, 470px));

    & > * {
      scroll-snap-align: start;
      max-width: calc(100cqw - 32px);
      --poster-padding: 16px;
      --poster-title: 20px;
      --poster-caption: 13px;
    }
    & > :first-child {
      margin-left: 16px;
    }
    & > :last-child {
      margin-right: 16px;
    }
  }
  /* a phone on its side: the cards at their 200px floor above the pill's band, the words
     sized to fit */
  @media (height < 500px) {
    padding-bottom: 64px;

    & > * {
      --poster-padding: 14px;
      --poster-title: 18px;
      --poster-caption: 13px;
    }
  }

  @media ${MEDIA.desktop} {
    padding-inline: 36px;
    scroll-snap-type: none;

    & > :first-child,
    & > :last-child {
      margin: 0;
    }
    /* the words grow with the card: 28px, 15px and 20px at 1280, and their caps where the
       card reaches its own */
    & > * {
      --poster-padding: clamp(20px, 1.6vw, 30px);
      --poster-title: clamp(28px, 2.2vw, 42px);
      --poster-caption: clamp(15px, 1.2vw, 22px);
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

// the cream pill (components/Pill.tsx) at the page's bottom right, the one light thing on
// the page, its left padding drawn in for the plus
const NewButton = styled(Pill.Cream)`
  position: absolute;
  z-index: 3;
  right: 16px;
  bottom: 24px;
  padding-left: 1em;

  @media ${MEDIA.desktop} {
    right: clamp(36px, 2.8vw, 72px);
    bottom: clamp(28px, 2.2vw, 56px);
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
                paper={paperOf(campaign._id)}
                art={artOf(campaign._id)}
                title={campaign.name}
                caption={`${roleOf(campaign.isOwner, campaign.myCharacter)} · ${count(others.length, campaign.isOwner ? "player" : "other")}`}
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
