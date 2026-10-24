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

// the page below the strip, as the other pages sit (user, 2026-10-22; from 2026-10-21 to
// then it spanned the layout's rows behind the strip to take the wheel from its empty
// ground, for the sideways row)
const Page = styled.div`
  ${GROUND}
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

// the one scroller on the page, with its bar (the app shows every scrollbar, user
// 2026-10-22; RootLayout.tsx styles them), and the size the wall measures its cards against.
// Its scroll is the strip's `--page` timeline (navigation/Strip.tsx draws its foot by it).
const Scroller = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  container-type: size;
  overflow-y: auto;
  scroll-timeline: --page block;
`;

// the landscape along the foot of the page behind the wall, faint on the ground and faded in
// from its top, so the cards sit on plain ground and the grass shows at the end
// (its own image: the wall's hero cropped the wide woodcut to its right third, 2026-10-19;
// screened over the whole page behind the sideways row, 2026-10-21 to 2026-10-22)
const Hero = styled.img`
  position: absolute;
  z-index: 0;
  left: 0;
  right: 0;
  bottom: -40px;
  width: 100%;
  aspect-ratio: 2301 / 844;
  object-fit: cover;
  object-position: top;
  opacity: 0.38;
  pointer-events: none;
  mask-image: linear-gradient(transparent, #000 45%);

  @media ${MEDIA.mobile} {
    bottom: 0;
    opacity: 0.3;
  }
`;

const Notice = styled(Font.Italic16)`
  position: absolute;
  z-index: 2;
  top: 12px;
  left: 16px;
  right: 16px;
  text-align: center;
`;

// The campaigns as a wall of posters, the most recently active first (campaigns.list),
// wrapping into rows: one row stands centred in the height above the New campaign pill's
// band, more fill the page from the top and scroll (navigation/README.md has the drafts and
// the history). The cards are 17 wide to 28 tall around the sizes the sideways row settled
// on: 340 by 560 at 1280 wide, growing with a desktop to 520 by 856, 285 by 470 on a phone,
// shorter where the scroller less its paddings is, never under 200px (a phone on its side).
// A row runs edge to edge (user, 2026-10-22): as many columns as fit at the floor, 15% under
// on a desktop, 40% under on a tablet and half on a phone (two across), share the width, and
// a card stops at 15% over, keeping left in its column, where a share would pass it (one or
// two columns). auto-fill keeps the empty tracks, so a partial row keeps left at the full
// rows' size; the ceiling is on the card, not the track, since a track with a definite max
// is counted by that max (css-grid 7.2.3.2: five cards sat as four at their largest and a
// gap). The rows take their height from the cards' ratio, so the cards are not stretched.
// Spaced as the home and overview walls are: 6px under the strip, 36px gutters on a desktop
// and 16px below one, 18px and 16px between the cards (a tad over the walls' 14px and 12px,
// user), the pill's band at the foot as on the players page. A cap of four columns, the
// centring and a cream glow on the cards (the last of "Spotlight") all went on 2026-10-22.
const Wall = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min), 1fr));
  align-content: safe center;
  align-items: start;
  gap: var(--gap);
  min-height: 100%;
  padding: 6px 16px 84px;
  --gap: 16px;
  /* the tallest a card can stand: the scroller less the 90px of top and bottom padding */
  --card-ceiling: max(200px, 100cqh - 90px);
  --card-height: min(560px, var(--card-ceiling));
  --card-min: calc(var(--card-height) * 0.6 * 17 / 28);
  --card-max: calc(min(var(--card-height) * 1.15, var(--card-ceiling)) * 17 / 28);

  & > * {
    max-width: var(--card-max);
    aspect-ratio: 17 / 28;
    --poster-padding: 16px;
    --poster-title: 20px;
    --poster-caption: 13px;
  }

  /* a phone: two cards across, the words sized to them */
  @media ${MEDIA.mobile} {
    --card-height: min(470px, var(--card-ceiling));
    --card-min: calc(var(--card-height) * 0.5 * 17 / 28);

    & > * {
      --poster-padding: 12px;
      --poster-title: 16px;
      --poster-caption: 12px;
    }
  }
  /* the words grow with the card: 28px, 15px and 20px at 1280, and their caps where the
     card reaches its own */
  @media ${MEDIA.desktop} {
    padding: 6px 36px 110px;
    --gap: 18px;
    --card-ceiling: max(200px, 100cqh - 116px);
    --card-height: min(clamp(560px, 32.1vw, 856px), var(--card-ceiling));
    --card-min: calc(var(--card-height) * 0.85 * 17 / 28);

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
        <Scroller>
          <Wall>
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
          </Wall>
        </Scroller>
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
