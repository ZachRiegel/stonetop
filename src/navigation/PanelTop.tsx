import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import standingStonePng from "icons/standingStone.png";
import type { Navigation } from "navigation/NavigationContext.tsx";
import { Link } from "react-router";

// a mark and, beside it, the words: laid out as the sections' rows are, so the mark sits
// over theirs and stays in the folded sidebar while the words fade
const Top = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  padding: 0 12px;
`;

// a campaign's words: a small line with "Campaign" at the left and the way home at the
// right, the campaign's name in bold beneath, wrapping as it must. Set tight (14px and 24px
// lines, 2px between) so one line of each is 40px, the mark's height: the sidebar then
// folds without the top changing height (user: no animating two ways at once).
const CampaignWords = styled.div`
  min-width: 0;
  display: grid;
  row-gap: 2px;
  align-content: center;
`;

const Eyebrow = styled.div`
  display: grid;
  grid-template-columns: 1fr max-content;
  align-items: center;
  column-gap: 12px;
  height: 14px;
`;

const Home = styled(Link)`
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  column-gap: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  line-height: 14px;
  border-radius: 6px;
  color: var(--neutral-600);
  text-decoration: none;

  &:hover {
    color: var(--neutral-800);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: -2px;
  }
`;

const Grey = styled(Font.Italic14)`
  color: var(--neutral-500);
  line-height: 14px;
`;

const Inherit = styled(Font.Semibold14)`
  color: inherit;
`;

const Name = styled(Font.Bold20)`
  color: var(--neutral-800);
  line-height: 24px;
`;

// The top of the navigation, on a desktop's sidebar and a phone's panel alike: inside a
// campaign, the campaign's mark and, beside it, "Campaign" with the way home (the standing
// stone and "Home") at the line's end and the campaign's name beneath; on the base pages,
// the standing stone and the app's name (README.md here). The mark is the first child and
// the words the last, which the sidebar relies on to fold.
const PanelTop = ({
  campaign,
  onPick,
  className,
}: {
  campaign?: Navigation["campaign"];
  onPick?: () => void;
  className?: string;
}) => (
  <Top className={className}>
    {campaign ? (
      <>
        <NavigationIcon {...campaign.glyph} />
        <CampaignWords>
          <Eyebrow>
            <Grey element="div" text="Campaign" />
            <Home to={campaign.back.to} onClick={onPick}>
              <NavigationIcon {...campaign.back.glyph} size={18} color="currentColor" />
              <Inherit element="span" text={campaign.back.text} />
            </Home>
          </Eyebrow>
          <Name element="div" text={campaign.name} />
        </CampaignWords>
      </>
    ) : (
      <>
        <NavigationIcon src={standingStonePng} />
        <Name element="div" text="Stonetop" />
      </>
    )}
  </Top>
);

export default PanelTop;
