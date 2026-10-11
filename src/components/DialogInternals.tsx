// The bare <dialog> that hoc/MakeDialog.tsx drives: closing goes through app state so the
// exit animation plays. Modal, SidePanel and Popover style it.
import type { ReactNode, RefObject } from "react";

const DialogInternals = ({
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

export default DialogInternals;
