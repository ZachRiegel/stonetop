// The roll log: a side panel listing the campaign's last 20 rolls, newest first, each as
// the readout the notification shows. MakeDialog mounts it only while open, so it
// subscribes only then.
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Loading from "components/Loading.tsx";
import SidePanel from "components/SidePanel.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import MakeDialog from "hoc/MakeDialog.tsx";
import RollReadout from "pages/dice/RollReadout.tsx";

const Panel = styled.div`
  height: 100%;
  width: 360px;
  display: grid;
  grid-template-rows: max-content 1fr;
  background: var(--neutral-100);
`;

// the title, with a close button at the far end
const Header = styled.div`
  display: grid;
  grid-template-columns: 1fr max-content;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 2px solid var(--neutral-150);
`;

const Rolls = styled.div`
  display: grid;
  align-content: start;
  padding: 4px 20px;
  overflow-y: auto;
`;

const Empty = styled(Font.Italic16)`
  padding: 12px 0;
`;

// a roll as the notification shows it, condensed, set apart from the next by a rule and
// space rather than a surface: outlined or filled cards in a column looked too busy
const Roll = styled.div`
  padding: 16px 4px;
  border-bottom: 1px solid var(--neutral-150);

  &:last-child {
    border-bottom: none;
  }
`;

const RollLog = ({
  campaignId,
  requestClose,
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
        <Button.Secondary Icon={Icon.Close} aria-label="Close" onClick={requestClose} />
      </Header>
      <Rolls>
        {rolls === undefined ? (
          <Loading.Small />
        ) : rolls.length === 0 ? (
          <Empty element="div" text="No rolls yet" />
        ) : (
          rolls.map((roll) => (
            <Roll key={roll._id}>
              <RollReadout
                condensed
                author={roll.author}
                time={roll._creationTime}
                dice={roll.dice}
                totals={roll.totals}
              />
            </Roll>
          ))
        )}
      </Rolls>
    </Panel>
  );
};

export default MakeDialog("isOpen", RollLog, SidePanel);
