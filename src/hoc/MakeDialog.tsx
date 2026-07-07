import AnimateInOut from "hoc/AnimateInOut.tsx";
import type { FC, ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";

type DialogComponent = FC<{
  isOpen: boolean;
  requestClose: () => void;
  children: ReactNode;
  dialogRef: RefObject<HTMLDialogElement | null>;
}>;

// Sample call pattern for
// const SomeDialogContent = ({isOpen}: {isOpen: boolean}) => {
//   return (
//     <Card>
//       <Font.Bold32 element={"h2"} text={`Modal is ${isOpen ? open : close}`} />
//       <Font.Normal16 text={"words words words"} />
//     </Card>
//   );
// }
//
// export default MakeDialog("isOpen", SomeDialogContent, Modal);

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
        afterUnmount={() => openerRef.current?.focus()}
      >
        {Content(props)}
      </AnimatedDialog>
    );
  };
};

export default MakeDialog;
