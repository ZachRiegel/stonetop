import AnimateInOut from "hoc/AnimateInOut.tsx";
import type { FC, ReactNode, RefObject } from "react";
import { createElement, useCallback, useEffect, useRef } from "react";

type DialogComponent = FC<{
  isOpen: boolean;
  requestClose: () => void;
  children: ReactNode;
  dialogRef: RefObject<HTMLDialogElement | null>;
}>;

// Wraps dialog content in a dialog shell (Modal, DialogInternals) opened by its `key` prop:
//   const Content = ({ isOpen }: { isOpen: boolean; requestClose: () => void }) => <Card … />;
//   export default MakeDialog("isOpen", Content, Modal);
// The dialog opens modally, plays its exit before unmounting and returns focus to the opener.

const MakeDialog = <
  K extends string,
  P extends { requestClose: () => void } & { [Key in K]?: unknown },
>(
  key: K,
  Content: (props: P) => ReactNode,
  Dialog: DialogComponent,
) => {
  const AnimatedDialog = AnimateInOut("isOpen", Dialog);

  return (props: P) => {
    const isOpen = Boolean(props[key]);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const openerRef = useRef<HTMLElement>(null);
    const afterUnmount = useCallback(() => openerRef.current?.focus(), []);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (isOpen && dialog && !dialog.open) {
        openerRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
    }, [isOpen]);

    return (
      <AnimatedDialog
        isOpen={isOpen}
        requestClose={props.requestClose}
        dialogRef={dialogRef}
        afterUnmount={afterUnmount}
      >
        {/* rendered as a component (createElement: JSX cannot type a generic one), so its
            hooks and state live only while the dialog is mounted; called as a function they
            would run on every render of the closed one */}
        {createElement(Content, props)}
      </AnimatedDialog>
    );
  };
};

export default MakeDialog;
