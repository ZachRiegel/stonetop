import { useEffect, useRef } from "react";
import type { ComponentType, ReactNode, RefObject } from "react";

import AnimateInOut from "hoc/AnimateInOut.tsx";

type DialogComponent = ComponentType<{
  isOpen: boolean;
  close: () => void;
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

const MakeDialog = <K extends string, P extends Record<K, boolean>>(
  key: K,
  Content: ComponentType<P>,
  Dialog: DialogComponent,
) => {
  const AnimatedDialog = AnimateInOut("isOpen", Dialog);

  return (props: P & { close: () => void }) => {
    const isOpen = Boolean(props[key]);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
      const dialog = dialogRef.current;
      // the open guard handles re-opening while the exit animation is still playing
      if (isOpen && dialog && !dialog.open) dialog.showModal();
    }, [isOpen]);

    // TS cannot relate spreads of the generic P through JSX.LibraryManagedAttributes
    const RenderableContent = Content as ComponentType<object>;

    return (
      <AnimatedDialog isOpen={isOpen} close={props.close} dialogRef={dialogRef}>
        <RenderableContent {...props} />
      </AnimatedDialog>
    );
  };
};

export default MakeDialog;
