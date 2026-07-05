import styled from "@emotion/styled";
import type { HTMLInputTypeAttribute } from "react";
import * as React from "react";

import { FontCSS } from "./Font.tsx";

const InputInternals = ({
  value,
  onChange,
  label,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string, event: React.ChangeEvent) => void;
  label?: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  className?: string;
}) => {
  const id = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLLabelElement>(null);

  // The border-notch mask lives on .frame and can't measure the sibling
  // label from CSS, so its width is published as --label-width.
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
          type={type}
          value={value}
          // A whitespace placeholder renders as nothing but keeps
          // :placeholder-shown usable as the "input is empty" test.
          placeholder={placeholder || " "}
          onChange={(event) => onChange(event.target.value, event)}
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

// noinspection CssInvalidFunction
const Input = styled(InputInternals)`
  position: relative;
  --animation-duration: 200ms;

  & > .frame {
    position: relative;
    padding: 2px;

    // The border is drawn on a pseudo-element so it can be clipped to a
    // ring without also clipping the input: an outer octagon plus an inner
    // octagon traced as an evenodd hole (the repeated 8px 0 / 8.83px 2px
    // points bridge the two rings with a zero-width seam). The inner
    // diagonal corners sit at 8px + 2*sqrt(2) - 2px = 8.83px so the
    // diagonals are the same 2px thick as the straight edges.
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--neutral-500);
      transition: mask var(--animation-duration) allow-discrete;
      clip-path: polygon(
        evenodd,
        8px 0,
        calc(100% - 8px) 0,
        100% 8px,
        100% calc(100% - 8px),
        calc(100% - 8px) 100%,
        8px 100%,
        0 calc(100% - 8px),
        0 8px,
        8px 0,
        8.83px 2px,
        calc(100% - 8.83px) 2px,
        calc(100% - 2px) 8.83px,
        calc(100% - 2px) calc(100% - 8.83px),
        calc(100% - 8.83px) calc(100% - 2px),
        8.83px calc(100% - 2px),
        2px calc(100% - 8.83px),
        2px 8.83px,
        8.83px 2px
      );
      mask:
        linear-gradient(to right, #000 14px, transparent 0 0, #000 0) 0 0 / 100% 2px no-repeat,
        linear-gradient(#000, #000) 0 2px / 100% calc(100%) no-repeat;
    }

    & > input {
      width: 100%;
      padding: 12px 16px;
      border: none;
      //border: 1px solid var(--neutral-600);
      outline: none;
      // transparent beats the UA default (white-ish "field")
      background-color: transparent;
      color: var(--neutral-700);
      ${FontCSS.Semibold16}

      &::placeholder {
        color: var(--neutral-400);
      }
    }
  }

  & > label {
    position: absolute;
    left: 18px;
    // centered in the frame (50% of the root sits 5px above that)
    top: calc(50%);
    transform: translateY(-50%);
    pointer-events: none;
    white-space: nowrap;
    ${FontCSS.Semibold16}
    color: var(--neutral-500);
    transition: top var(--animation-duration) ease-in-out;
  }

  // floated: focused, non-empty, or a real placeholder (not the " " fallback)
  &:focus-within,
  &:has(input:not(:placeholder-shown)),
  &:has(input:not([placeholder=" "])) {
    & > label {
      top: -3px;
    }

    // Erase the border's top 2px behind the label (its 18px inset ± 4px).
    // Gated on a label existing: --label-width's registered initial is 0px,
    // so an ungated mask would cut an empty 14-22px hole in label-less inputs.
    &:has(> label) > .frame::before {
      mask:
        linear-gradient(to right, #000 14px, transparent 0 calc(22px + var(--label-width)), #000 0)
          0 0 / 100% 2px no-repeat,
        linear-gradient(#000, #000) 0 2px / 100% calc(100%) no-repeat;
    }
  }
`;

export default Input;
