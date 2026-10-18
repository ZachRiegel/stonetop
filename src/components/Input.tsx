import styled from "@emotion/styled";
import { FontCSS } from "components/Font.tsx";
import type { HTMLInputTypeAttribute, Ref } from "react";
import * as React from "react";

const InputInternals = ({
  value,
  onChange,
  onKeyDown,
  inputRef,
  label,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string, event: React.ChangeEvent) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  label?: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  className?: string;
}) => {
  const id = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLLabelElement>(null);

  // The mask that cuts the label's gap out of the border lives on .frame::before and can't
  // measure the sibling label from CSS, so its width is published as --label-width.
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const labelElement = labelRef.current;
    if (!root || !labelElement) return;
    const observer = new ResizeObserver(() =>
      root.style.setProperty("--label-width", `${labelElement.offsetWidth}px`),
    );
    observer.observe(labelElement);
    return () => observer.disconnect();
  }, [label]);

  return (
    <div className={className} ref={rootRef}>
      <div className="frame">
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          // A whitespace placeholder renders as nothing but keeps
          // :placeholder-shown usable as the "input is empty" test.
          placeholder={placeholder || " "}
          onChange={(event) => onChange(event.target.value, event)}
          onKeyDown={onKeyDown}
        />
      </div>
      {label && (
        <label ref={labelRef} htmlFor={id}>
          {label}
        </label>
      )}
    </div>
  );
};

// The Glass look (chosen from src/holding/dropdownDrafts.html): a 12px-rounded 2px border,
// grey at rest and cream with focus, the label standing on the border with its baseline on
// the border's bottom edge and the border cut away behind it.
const Input = styled(InputInternals)`
  position: relative;
  --animation-duration: 200ms;

  & > .frame {
    position: relative;
    padding: 2px;

    // The border is drawn on a pseudo-element so the label's gap can be cut out of it with a
    // mask without touching the input. It lies over the input, so clicks must pass through it
    // (the old octagon clip-path limited hit-testing to the ring; a plain border does not).
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      border: 2px solid var(--neutral-500);
      border-radius: 12px;
      transition: border-color var(--animation-duration);
      mask:
        linear-gradient(to right, #000 14px, transparent 0 0, #000 0) 0 0 / 100% 2px no-repeat,
        linear-gradient(#000, #000) 0 2px / 100% calc(100%) no-repeat;
    }
    &:focus-within::before {
      border-color: var(--cream);
    }

    & > input {
      width: 100%;
      padding: 12px;
      border: none;
      outline: none;
      // transparent beats the UA default (white-ish "field")
      background-color: transparent;
      color: var(--neutral-900);
      ${FontCSS.Semibold16}

      &::placeholder {
        color: var(--neutral-400);
      }
    }
  }

  // The label stands on the border with its baseline on the border's bottom edge: with the
  // line box the font's own height, the baseline sits 14.67px down (measured in the browser),
  // and the border is 2px.
  & > label {
    position: absolute;
    left: 18px;
    top: -12.67px;
    line-height: 1;
    pointer-events: none;
    white-space: nowrap;
    ${FontCSS.Semibold16}
    color: var(--neutral-500);
    transition: color var(--animation-duration);
  }
  &:focus-within > label {
    color: var(--cream);
  }

  // Erase the border's top 2px behind the label (its 18px inset ± 4px).
  // Gated on a label existing: --label-width's registered initial is 0px,
  // so an ungated mask would cut an empty 14-22px hole in label-less inputs.
  &:has(> label) > .frame::before {
    mask:
      linear-gradient(to right, #000 14px, transparent 0 calc(22px + var(--label-width)), #000 0) 0
        0 / 100% 2px no-repeat,
      linear-gradient(#000, #000) 0 2px / 100% calc(100%) no-repeat;
  }
`;

export default Input;
