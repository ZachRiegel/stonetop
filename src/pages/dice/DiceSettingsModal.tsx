import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import ButtonRow from "components/ButtonRow.tsx";
import Font from "components/Font.tsx";
import Modal from "components/Modal.tsx";
import Toggle from "components/Toggle.tsx";
import MakeDialog from "hoc/MakeDialog.tsx";
import { isEnabled, play, setEnabled, subscribe, unlock } from "pages/dice/sounds.ts";
import { useSyncExternalStore } from "react";

const Card = styled.div`
  display: grid;
  width: 360px;
  border-radius: 16px;
  background: var(--neutral-75);
`;

const CardHeader = styled.div`
  padding: 12px 20px;
`;

const CardBody = styled.div`
  padding: 20px;
  border-top: 2px solid var(--neutral-100);
  border-bottom: 2px solid var(--neutral-100);
`;

const CardFooter = styled.div`
  padding: 16px 20px;
`;

// The dice page's settings: for now, whether rolls make a sound on this device.
const DiceSettings = ({ requestClose }: { isOpen: boolean; requestClose: () => void }) => {
  const sounds = useSyncExternalStore(subscribe, isEnabled);
  return (
    <Card>
      <CardHeader>
        <Font.Bold32 element="h2" text="Settings" />
      </CardHeader>
      <CardBody>
        <Toggle
          checked={sounds}
          label="Dice sound effects"
          onChange={(on) => {
            setEnabled(on);
            // a preview knock, which also starts the audio from this gesture
            if (on) void unlock().then(() => play({ kind: "table", strength: 1 }));
          }}
        />
      </CardBody>
      <CardFooter>
        <ButtonRow>
          <Button.Secondary text="Done" onClick={requestClose} />
        </ButtonRow>
      </CardFooter>
    </Card>
  );
};

export default MakeDialog("isOpen", DiceSettings, Modal);
