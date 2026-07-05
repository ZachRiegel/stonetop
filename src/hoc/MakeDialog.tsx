import AnimateInOut from "hoc/AnimateInOut.tsx";
import type { ComponentType, FunctionComponent, ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";

type DialogComponent = ComponentType<{
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

    useEffect(() => {
      const dialog = dialogRef.current;
      // the open guard handles re-opening while the exit animation is still playing
      if (isOpen && dialog && !dialog.open) dialog.showModal();
    }, [isOpen]);

    return (
      <AnimatedDialog isOpen={isOpen} requestClose={props.requestClose} dialogRef={dialogRef}>
        {Content(props)}
      </AnimatedDialog>
    );
  };
};

export default MakeDialog;
