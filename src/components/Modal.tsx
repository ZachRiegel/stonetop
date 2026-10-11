// A centred dialog that fades in and out; the content sets its own size and background.
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import DialogInternals from "components/DialogInternals.tsx";

const FadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const FadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const BackdropIn = keyframes`
  from {
    background-color: rgb(0 0 20 / 0);
  }
  to {
    background-color: rgb(0 0 20 / 0.2);
  }
`;

const BackdropOut = keyframes`
  from {
    background-color: rgb(0 0 20 / 0.2);
  }
  to {
    background-color: rgb(0 0 20 / 0);
  }
`;

const Modal = styled(DialogInternals)<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  display: grid;
  justify-content: center;
  align-content: center;
  padding-left: 64px;
  cursor: default;

  & section {
    isolation: isolate;
    animation: ${(props) => (props.isOpen ? FadeIn : FadeOut)} 300ms linear both;
  }

  &::backdrop {
    position: fixed;
    inset: 0;
    animation: ${(props) => (props.isOpen ? BackdropIn : BackdropOut)} 300ms linear both;
  }
`;

export default Modal;
