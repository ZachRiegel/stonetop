import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import ButtonRow from "components/ButtonRow.tsx";
import DropdownField from "components/DropdownField.tsx";
import Font from "components/Font.tsx";
import Modal from "components/Modal.tsx";
import Toggle from "components/Toggle.tsx";
import MakeDialog from "hoc/MakeDialog.tsx";
import { CLEAR_AFTER, clearAfter } from "pages/dice/preferences.ts";
import { isEnabled, play, setEnabled, subscribe, unlock } from "pages/dice/sounds.ts";
import { useState, useSyncExternalStore } from "react";

const Card = styled.div`
  display: grid;
  width: 360px;
  border-radius: 16px;
  background: var(--neutral-75);
`;

const CardHeader = styled.div`
  padding: 12px 20px;
`;

// room above the field for its label, which stands on its border
const CardBody = styled.div`
  display: grid;
  gap: 28px;
  padding: 20px;
  border-top: 2px solid var(--neutral-100);
  border-bottom: 2px solid var(--neutral-100);
`;

const CardFooter = styled.div`
  padding: 16px 20px;
`;

// The dice page's settings, both for this device: whether rolls make a sound, and how long a
// roll stays on the table before it clears on its own.
const DiceSettings = ({ requestClose }: { isOpen: boolean; requestClose: () => void }) => {
  const sounds = useSyncExternalStore(subscribe, isEnabled);
  const seconds = useSyncExternalStore(clearAfter.subscribe, clearAfter.get);
  const [query, setQuery] = useState("");
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
        <DropdownField
          items={CLEAR_AFTER}
          selectedItem={seconds}
          setSelectedItem={clearAfter.set}
          itemToLabel={(choice) => choice.label}
          itemToValue={(choice) => choice.seconds}
          query={query}
          setQuery={setQuery}
          emptyState={<Font.Italic16 text="No such time" />}
          label="Clear dice after"
          placeholder="Choose a time"
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
