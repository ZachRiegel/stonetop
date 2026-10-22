// A centred dialog that fades in and out; the content sets its own size and background.
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import DialogInternals from "components/DialogInternals.tsx";

const FadeIn = keyframes`
  from {
    opacity: 0;
  }
`;

const FadeOut = keyframes`
  to {
    opacity: 0;
  }
`;

// the backdrop dims the page with the palette's black (a navy tint read too blue); ::backdrop
// inherits the dialog's custom properties, which RootLayout.tsx sets on dialog as well as :root
const BackdropIn = keyframes`
  from {
    background-color: transparent;
  }
`;

const BackdropOut = keyframes`
  to {
    background-color: transparent;
  }
`;

// centred on the page (an offset for the sidebar's rail went with the sidebar, 2026-10-20),
// and scrolling if a phone turned sideways is shorter than the content
const Modal = styled(DialogInternals)<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  display: grid;
  justify-content: center;
  /* centred while it fits; once it is taller than the screen its top stays reachable */
  align-content: safe center;
  padding: 16px;
  overflow-y: auto;
  cursor: default;

  /* the content's own corners, so the shadow follows them; deeper than --shadow-large, the
     user wanting the modals to stand further off the dimmed page */
  & > section {
    isolation: isolate;
    border-radius: 16px;
    box-shadow: 0 24px 48px rgb(0 0 0 / 0.6);
    animation: ${(props) => (props.isOpen ? FadeIn : FadeOut)} 300ms linear both;
  }

  &::backdrop {
    position: fixed;
    inset: 0;
    background-color: color-mix(in srgb, var(--neutral-0) 20%, transparent);
    animation: ${(props) => (props.isOpen ? BackdropIn : BackdropOut)} 300ms linear both;
  }
`;

export default Modal;
