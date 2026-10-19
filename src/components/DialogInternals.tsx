// The bare <dialog> that hoc/MakeDialog.tsx drives: closing goes through app state so the
// exit animation plays. Modal, SidePanel and Popover style it. Its last child is the mount
// node it offers as the portal target (PortalTargetContext.tsx): a contents box after the
// section, so portaled content is in the top layer, later in tree order than anything in the
// section (as anchor positioning wants), and adds no track to a grid of the dialog's own.
import styled from "@emotion/styled";
import { PortalTargetContext } from "PortalTargetContext.tsx";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useState,
} from "react";

// boxless, so it adds no track to a dialog laid out as a grid (SidePanel.tsx) and nothing for
// a click to land on; what is portaled into it is placed by the viewport
const Mount = styled.div`
  display: contents;
`;

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
}) => {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  // Esc must close through app state so the exit animation plays
  const onCancel = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();
      requestClose();
    },
    [requestClose],
  );
  // the dialog spans the viewport; only clicks outside <section> hit it directly
  const onClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (event.target === event.currentTarget) requestClose();
    },
    [requestClose],
  );
  const onKeyDown = useCallback((event: KeyboardEvent) => event.stopPropagation(), []);
  return (
    <dialog
      ref={dialogRef}
      className={className}
      onCancel={onCancel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span tabIndex={0} />
      <PortalTargetContext value={portalTarget}>
        <section>{children}</section>
      </PortalTargetContext>
      <Mount ref={setPortalTarget} />
    </dialog>
  );
};

export default DialogInternals;
