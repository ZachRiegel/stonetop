// The roll log: a side panel listing the campaign's last 20 rolls, newest first, with who
// threw them. MakeDialog mounts it only while open, so it subscribes only then.
import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Loading from "components/Loading.tsx";
import SidePanel from "components/SidePanel.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import MakeDialog from "hoc/MakeDialog.tsx";
import { countsOf, type DieColour, LABELS, SYMBOLS } from "pages/dice/dice.ts";

const DIE_ICONS: Record<DieColour, React.FC<{ className?: string }>> = {
  blue: Icon.DieBlue,
  violet: Icon.DieViolet,
  orange: Icon.DieOrange,
};

const Panel = styled.div`
  height: 100%;
  width: 360px;
  display: grid;
  grid-template-rows: max-content 1fr;
  background: var(--neutral-100);
`;

const Header = styled.div`
  padding: 12px 20px;
  border-bottom: 2px solid var(--neutral-150);
`;

const Rolls = styled.div`
  display: grid;
  align-content: start;
  padding: 8px 20px;
  overflow-y: auto;
`;

const Empty = styled(Font.Italic16)`
  padding: 12px 0;
`;

// "Cthaeh rolled 3 ◆" with the time at the end, then "4 bursts  0 specials  0 fails" below
const Roll = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  grid-template-areas:
    "avatar thrown time"
    "avatar totals totals";
  align-items: center;
  column-gap: 8px;
  row-gap: 2px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--neutral-150);

  &:last-child {
    border-bottom: none;
  }
`;

const Avatar = styled.img`
  grid-area: avatar;
  align-self: start;
  width: 30px;
  height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

// a count beside its die, the die dropped a little below the baseline to sit with the text
const Pips = styled.span`
  white-space: nowrap;
  --icon-size: 30px;

  & > div {
    vertical-align: -4.5px;
    margin-left: 6px;
  }
`;

const Thrown = styled.div`
  grid-area: thrown;
`;

const Time = styled(Font.Normal14)`
  grid-area: time;
  color: var(--neutral-500);
`;

const Totals = styled.div`
  grid-area: totals;
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  column-gap: 12px;
`;

// a name reads as the start of a sentence whatever its owner typed
const capitalised = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const timeOf = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

const RollLog = ({
  campaignId,
}: {
  isOpen: boolean;
  requestClose: () => void;
  campaignId: string;
}) => {
  const rolls = useQuery(api.messages.recent, { campaignId });
  return (
    <Panel>
      <Header>
        <Font.Title24 element="h2" text="Roll log" />
      </Header>
      <Rolls>
        {rolls === undefined ? (
          <Loading.Small />
        ) : rolls.length === 0 ? (
          <Empty element="div" text="No rolls yet" />
        ) : (
          rolls.map((roll) => (
            <Roll key={roll._id}>
              <Avatar src={roll.author.picture} alt="" />
              <Thrown>
                <Font.Bold24 text={capitalised(roll.author.displayName)} />
                <Font.Normal24 text=" rolled " />
                {countsOf(roll.dice).map(([colour, count]) => {
                  const Die = DIE_ICONS[colour];
                  return (
                    <Pips key={colour}>
                      <Font.Bold24 text={String(count)} />
                      <Die />
                    </Pips>
                  );
                })}
              </Thrown>
              <Time element="div" text={timeOf.format(roll._creationTime)} />
              <Totals>
                {SYMBOLS.map((symbol) => (
                  <Font.Normal16
                    key={symbol}
                    element="div"
                    text={`${roll.totals[symbol]} ${LABELS[symbol].toLowerCase()}`}
                  />
                ))}
              </Totals>
            </Roll>
          ))
        )}
      </Rolls>
    </Panel>
  );
};

export default MakeDialog("isOpen", RollLog, SidePanel);
