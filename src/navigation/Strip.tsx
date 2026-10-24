// The strip across the top of every signed-in page (README.md here).
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { EYEBROW, TITLE } from "components/Font.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import TabRow from "components/TabRow.tsx";
import standingStonePng from "icons/standingStone.png";
import AccountMenu from "navigation/AccountMenu.tsx";
import type { Navigation } from "navigation/NavigationContext.tsx";
import type { ComponentProps } from "react";
import { Link } from "react-router";

// The strip's foot: a rule and a shadow drawn in over the first 40px a page scrolls, on the
// `--page` timeline the page's scroller names (README.md here has the drafts). The rule is a
// border there at rest, clear, so nothing moves; the shadow is the whole shell's, since a blur
// smears a 1px bar to nothing. Lifted over the page, which is painted after it.
const settle = keyframes`
  to {
    border-color: var(--neutral-100);
    box-shadow: 0 4px 10px rgb(0 0 0 / 0.7);
  }
`;

// the header and a phone's tab row together, so the foot is one edge
const Shell = styled.div`
  position: relative;
  z-index: 1;
  border-bottom: 1px solid transparent;
  box-shadow: 0 4px 10px transparent;

  @supports (animation-timeline: scroll()) {
    animation: ${settle} linear both;
    animation-timeline: --page;
    animation-range: 0 40px;
  }
`;

// the head of the strip: the mark, where you are, the tabs (a desktop) and the account at
// the end. Flex rather than grid: what it holds varies, and the account's auto margin sends
// it to the end whatever came before.
const Header = styled.header<{ compact: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  ${({ compact }) => (compact ? "min-height: 60px; padding: 0 16px;" : "height: 76px; padding: 0 36px;")}
`;

// the app's mark, the standing stone in grey: the way home from anywhere (user, 2026-10-19;
// seven other ways back were drafted and dropped, README.md here)
const Mark = styled(Link)`
  flex: none;
  display: grid;
  place-items: center;
  margin-right: 4px;
  border-radius: 999px;
  color: var(--neutral-500);
  transition: color 120ms linear;

  &:hover {
    color: var(--neutral-800);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

// where you are: "Campaign" small over the campaign's name, ruled off from the tabs on a
// desktop; on a phone the app's name outside a campaign, and names are cut to the room
const Where = styled.div<{ compact: boolean }>`
  display: grid;
  min-width: 0;
  line-height: 1.1;
  ${({ compact }) =>
    !compact &&
    `margin: 0 14px 0 4px; padding-right: 20px; border-right: 2px solid var(--neutral-200);`}
`;

const Eyebrow = styled.div<{ compact: boolean }>`
  ${EYEBROW}
  font-size: ${({ compact }) => (compact ? 11 : 10)}px;
  color: var(--neutral-500);
`;

// a line box the face's full height: at the stack's 1.1 the clipped box cut 1px off the
// caps' top and foot
const Name = styled.div`
  ${TITLE}
  font-size: 16px;
  line-height: 1.25;
  letter-spacing: 0.04em;
  color: var(--cream);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Account = styled.div`
  margin-left: auto;
`;

// the phone's tabs, a row of their own under the header
const Row = styled(TabRow)`
  padding: 6px 16px 10px;
`;

// The strip across the top of every signed-in page (README.md here): the standing stone,
// then "Campaign" over the campaign's name inside one, then the sections as a row of tabs,
// and the account at the end. `compact`, for a phone or tablet, the tabs are a second row of
// glyph cells and the header shows the app's or the campaign's name and the account's
// picture alone.
const Strip = ({
  navigation,
  user,
  compact,
}: {
  navigation?: Navigation;
  user?: ComponentProps<typeof AccountMenu>["user"];
  compact: boolean;
}) => {
  const campaign = navigation?.campaign;
  return (
    <Shell>
      <Header compact={compact}>
        <Mark to="/" aria-label="Home" title="Home">
          <NavigationIcon src={standingStonePng} size={compact ? 32 : 36} />
        </Mark>
        {campaign ? (
          <Where compact={compact}>
            <Eyebrow compact={compact}>Campaign</Eyebrow>
            <Name>{campaign.name}</Name>
          </Where>
        ) : (
          compact && (
            <Where compact>
              <Name>Stonetop</Name>
            </Where>
          )
        )}
        {!compact && navigation && <TabRow tabs={navigation.sections} />}
        {user && (
          <Account>
            <AccountMenu user={user} compact={compact} />
          </Account>
        )}
      </Header>
      {compact && <Row tabs={navigation?.sections ?? []} compact />}
    </Shell>
  );
};

export default Strip;
