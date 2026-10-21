import styled from "@emotion/styled";
import { FontCSS } from "components/Font.tsx";
import { type ChangeEvent, type ReactNode, useCallback } from "react";

// A labelled switch: a native checkbox, so Space and the label click come free, drawn as a
// pill with a sliding knob. The label may be a node (pages/dice/DiceSettings.tsx hands it a
// row of words).
const ToggleInternals = ({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
}) => {
  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked),
    [onChange],
  );
  return (
    <label className={className}>
      <input type="checkbox" role="switch" checked={checked} onChange={onInputChange} />
      <span>{label}</span>
    </label>
  );
};

const Toggle = styled(ToggleInternals)`
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: center;
  column-gap: 12px;
  cursor: pointer;

  & > input {
    appearance: none;
    margin: 0;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background-color: var(--neutral-200);
    cursor: pointer;
    transition: background-color 150ms;

    &::before {
      content: "";
      display: block;
      width: 20px;
      height: 20px;
      margin: 2px;
      border-radius: 999px;
      background-color: var(--neutral-900);
      transition: translate 150ms;
    }

    &:checked {
      background-color: var(--cyan-500);

      &::before {
        translate: 20px 0;
      }
    }

    &:focus-visible {
      outline: 2px solid var(--neutral-700);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition-duration: 0ms;

      &::before {
        transition-duration: 0ms;
      }
    }
  }

  & > span {
    ${FontCSS.Semibold16}
    color: var(--neutral-700);
  }
`;

export default Toggle;
