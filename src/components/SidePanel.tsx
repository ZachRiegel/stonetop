// A dialog that slides in from the right edge, 12px off the viewport with 12px corners and a
// shadow; the content sets its own width and background and fills the height.
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import DialogInternals from "components/DialogInternals.tsx";

// fully off the right edge, past the dialog's padding
const SlideIn = keyframes`
  from {
    translate: calc(100% + 12px) 0;
  }
  to {
    translate: 0 0;
  }
`;

const SlideOut = keyframes`
  from {
    translate: 0 0;
  }
  to {
    translate: calc(100% + 12px) 0;
  }
`;

// the backdrop dims the page with the palette's black; ::backdrop inherits the dialog's
// custom properties, which RootLayout.tsx sets on dialog as well as :root
const DimIn = keyframes`
  from {
    background-color: transparent;
  }
  to {
    background-color: color-mix(in srgb, var(--neutral-0) 40%, transparent);
  }
`;

const DimOut = keyframes`
  from {
    background-color: color-mix(in srgb, var(--neutral-0) 40%, transparent);
  }
  to {
    background-color: transparent;
  }
`;

const SidePanel = styled(DialogInternals)<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  display: grid;
  justify-content: end;
  padding: 12px;
  /* the section starts past the right edge; without this the page gains a horizontal scroll */
  overflow: clip;
  cursor: default;

  & section {
    isolation: isolate;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: var(--shadow-large);
    animation: ${(props) => (props.isOpen ? SlideIn : SlideOut)} 300ms ease-out both;

    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0ms;
    }
  }

  &::backdrop {
    position: fixed;
    inset: 0;
    animation: ${(props) => (props.isOpen ? DimIn : DimOut)} 300ms linear both;
  }
`;

export default SidePanel;
