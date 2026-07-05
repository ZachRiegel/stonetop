import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import type { ReactNode, RefObject } from "react";

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

export const ModalInternals = ({
  requestClose,
  className,
  children,
  dialogRef,
}: {
  isOpen: boolean;
  requestClose: () => void;
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
      requestClose();
    }}
    onClick={(event) => {
      event.stopPropagation();
      // The dialog spans the viewport; only clicks outside <section> hit it directly
      if (event.target === event.currentTarget) requestClose();
    }}
    onKeyDown={(event) => event.stopPropagation()}
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
  padding-left: 64px;

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
