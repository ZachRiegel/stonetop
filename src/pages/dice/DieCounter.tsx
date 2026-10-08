import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import { type DieColour } from "pages/dice/dice.ts";
import type { FC } from "react";

const DIE_ICONS: Record<DieColour, FC<{ className?: string }>> = {
  blue: Icon.DieBlue,
  violet: Icon.DieViolet,
  orange: Icon.DieOrange,
};

const Counter = styled.div`
  display: grid;
  grid-template-columns: max-content max-content 2ch max-content;
  align-items: center;
  justify-items: center;
  column-gap: 8px;
  --icon-size: 40px;

  /* the icon is inline-flex; a grid cell keeps it off the text baseline */
  & > :first-of-type {
    display: grid;
  }
`;

const StepButton = styled(Button.Transparent)`
  &:where(:disabled) {
    opacity: 0.4;
  }
`;

const DieCounter = ({
  colour,
  count,
  max,
  setCount,
}: {
  colour: DieColour;
  count: number;
  // how many of this colour the pool has room for
  max: number;
  setCount: (count: number) => void;
}) => {
  const DieIcon = DIE_ICONS[colour];
  return (
    <Counter role="group" aria-label={`${colour} dice`}>
      <div aria-hidden>
        <DieIcon />
      </div>
      <StepButton text="−" disabled={count === 0} onClick={() => setCount(count - 1)} />
      <Font.Bold24 element="div" text={String(count)} />
      <StepButton text="+" disabled={count >= max} onClick={() => setCount(count + 1)} />
    </Counter>
  );
};

export default DieCounter;
