import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import type { AnimationEventHandler, ReactNode, RefObject } from "react";

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
    background-color: rgb(0 0 0 / 0);
  }
  to {
    background-color: rgb(0 0 0 / 0.5);
  }
`;

const BackdropOut = keyframes`
  from {
    background-color: rgb(0 0 0 / 0.5);
  }
  to {
    background-color: rgb(0 0 0 / 0);
  }
`;

const ModalInternals = ({
  close,
  className,
  children,
  dialogRef,
}: {
  isOpen: boolean;
  close: () => void;
  className?: string;
  children: ReactNode;
  dialogRef: RefObject<HTMLDialogElement | null>;
}) => (
  <dialog
    ref={dialogRef}
    className={className}
    onCancel={(event) => {
      // Esc must close through app state so the exit animation plays
      event.preventDefault();
      close();
    }}
  >
    <span tabIndex={0} />
    <section>{children}</section>
  </dialog>
);

const Modal = styled(ModalInternals)<{ isOpen: boolean }>`
  position: fixed;
  inset: 0;
  display: grid;
  justify-content: center;
  align-content: center;

  & section {
    isolation: isolate;
    animation: ${(props) => (props.isOpen ? FadeIn : FadeOut)} 300ms linear;
    animation-fill-mode: both;
  }

  &::backdrop {
    position: fixed;
    inset: 0;
    animation: ${(props) => (props.isOpen ? BackdropIn : BackdropOut)} 300ms linear;
    animation-fill-mode: both;
  }
`;

export default Modal;
