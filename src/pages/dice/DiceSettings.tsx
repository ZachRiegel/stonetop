// The dice page's settings, both for this device: whether rolls make a sound, and how long
// a roll stays on the table before it clears on its own. A glass card up and to the left of
// the die button, its bottom-right corner under the button's centre, with a title and a row
// per setting (a label, a line saying what it does, and the control); the die becomes an X
// while the card is up, as it does for the roll log. A modal dialog, as the log is, so Escape
// and a click outside close it. Drafted in src/holding/diceSettings.html (2026-10-18/19),
// where the alternatives were tried: six row layouts, ten entrances (the notification's bloom
// and its kin were too showy for a card this size), six seats against the button, and the
// log's black card.
import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import DialogInternals from "components/DialogInternals.tsx";
import DropdownField from "components/DropdownField.tsx";
import Font, { FontCSS } from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Toggle from "components/Toggle.tsx";
import MakeDialog from "hoc/MakeDialog.tsx";
import { CLEAR_AFTER, clearAfter } from "pages/dice/preferences.ts";
import { CELL, MARGIN } from "pages/dice/rollMenu/RollMenu.tsx";
import { isEnabled, play, setEnabled, subscribe, unlock } from "pages/dice/sounds.ts";
import { useCallback, useState, useSyncExternalStore } from "react";

// the die button's cell, which the page sets MARGIN in from its corner, the viewport's
const BUTTON = CELL;
// wide enough that no hint wraps beside its control (user, 2026-10-19)
const WIDTH = 400;
const CORNER = 16;
// the card's air: 24px above the title, 32px at the sides, and under the last row 96px plus
// a band the button's top quarter sits in (the user's numbers, 2026-10-19). The time field's
// list opens downward into that air and overhangs the card's foot by some 50px; the full
// 144px that kept it inside made the card too big
const AIR = 96 + BUTTON / 2 + 10;
// the open and the close, and the card's rise within the open
const MS = 150;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
`;
const fadeOut = keyframes`
  to {
    opacity: 0;
  }
`;
// the card rises a few pixels as it fades in (a diagonal drift out from under the button was
// chosen first, then made strictly vertical, user 2026-10-19); closing is the fade alone
const rise = keyframes`
  from {
    translate: 0 8px;
  }
`;

// The dialog spans the viewport, so a click anywhere off the card closes it (a click on the
// inert die button under the X included); its section is the die button's cell, which the
// X fills and the card hangs off. The section fades in and out, card and X together, so the
// die reads as crossfading into the X; AnimateInOut hears this animation end and unmounts.
const Dialog = styled(DialogInternals)<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;

  &::backdrop {
    background: none;
  }

  & > section {
    position: fixed;
    right: ${MARGIN}px;
    bottom: ${MARGIN}px;
    width: ${BUTTON}px;
    height: ${BUTTON}px;
    display: grid;
    animation: ${({ isOpen }) => (isOpen ? fadeIn : fadeOut)} ${MS}ms
      ${({ isOpen }) => (isOpen ? "ease-out" : "ease-in")} both;
  }
`;

// glass like the roll notification's (the log's black was offered and not taken), its
// bottom-right corner on the button's centre
const Card = styled.div`
  position: absolute;
  right: ${BUTTON / 2}px;
  bottom: ${BUTTON / 2}px;
  width: ${WIDTH}px;
  padding: 24px 32px ${AIR}px;
  border-radius: ${CORNER}px;
  border: 2px solid var(--cream);
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(6px);
  box-shadow: var(--shadow-medium);
  color: var(--cream);
  display: grid;
  row-gap: 12px;
  animation: ${rise} ${MS}ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// 16px from the title to the first row, with the rows' 12px gap
const Title = styled.h2`
  ${FontCSS.Bold20}
  margin: 0 0 4px;
  line-height: 32px;
`;

// a row: the words at the left, the control at the right
const row = css`
  display: grid;
  grid-template-columns: 1fr max-content;
  align-items: center;
  column-gap: 12px;
  min-height: 48px;
`;
const Row = styled.div`
  ${row}
`;
// the Toggle as a row, its switch at the right: the whole row is the switch's label, so a
// click anywhere on it flips the switch and the words name it to a screen reader
const Switch = styled(Toggle)`
  ${row}

  & > input {
    order: 2;
  }
`;
const Words = styled.span`
  display: grid;
  padding: 2px 0;
`;
const Label = styled.span`
  ${FontCSS.Semibold16}
  color: var(--neutral-700);
`;
const Hint = styled.span`
  ${FontCSS.Normal14}
  color: var(--neutral-500);
`;
// the time field, narrow; the row's words label it to the eye only, since Input takes no
// aria-label and its own label (the modal's, standing on the border) was not the look wanted
const Field = styled(DropdownField)`
  width: 164px;
` as typeof DropdownField;

// the X, the die button over again with the close icon at the menu's icon size, over the
// card's corner (positioned, so it paints above the absolute card)
const Close = styled(Button.Cream)`
  --icon-size: 28px;
  position: relative;
`;

const labelOf = (choice: { label: string }) => choice.label;
const secondsOf = (choice: { seconds: number }) => choice.seconds;
const noSuchTime = <Font.Italic16 text="No such time" />;

const DiceSettings = ({ requestClose }: { isOpen: boolean; requestClose: () => void }) => {
  const sounds = useSyncExternalStore(subscribe, isEnabled);
  const seconds = useSyncExternalStore(clearAfter.subscribe, clearAfter.get);
  const [query, setQuery] = useState("");
  const setSounds = useCallback((on: boolean) => {
    setEnabled(on);
    // a preview knock, which also starts the audio from this gesture
    if (on) void unlock().then(() => play({ kind: "table", strength: 1 }));
  }, []);
  return (
    <>
      <Card>
        <Title>Settings</Title>
        <Switch
          checked={sounds}
          onChange={setSounds}
          label={
            <Words>
              <Label>Dice sound effects</Label>
              <Hint>Knocks and clacks as the dice land</Hint>
            </Words>
          }
        />
        <Row>
          <Words>
            <Label>Clear dice after</Label>
            <Hint>How long the dice stay out</Hint>
          </Words>
          <Field
            items={CLEAR_AFTER}
            selectedItem={seconds}
            setSelectedItem={clearAfter.set}
            itemToLabel={labelOf}
            itemToValue={secondsOf}
            query={query}
            setQuery={setQuery}
            emptyState={noSuchTime}
            placeholder="Choose a time"
          />
        </Row>
      </Card>
      <Close Icon={Icon.Close} aria-label="Close the settings" onClick={requestClose} />
    </>
  );
};

export default MakeDialog("isOpen", DiceSettings, Dialog);
