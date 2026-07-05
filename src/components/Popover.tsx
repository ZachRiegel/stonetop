import styled from "@emotion/styled";
import { ModalInternals } from "components/Modal.tsx";
import MakeDialog from "hoc/MakeDialog.tsx";
import type { ReactNode } from "react";

const RenderChild = ({
  children,
}: {
  isOpen: boolean;
  requestClose: () => void;
  children: ReactNode;
}) => children;
const BaseModal = MakeDialog("isOpen", RenderChild, ModalInternals);

const PopoverInternals = ({
  className,
  children,
  content,
  isOpen,
  requestClose,
}: {
  className: string;
  children: ReactNode;
  content: ReactNode;
  isOpen: boolean;
  requestClose: () => void;
}) => {
  return (
    <div className={className}>
      <div className="anchor">{children}</div>
      <BaseModal isOpen={isOpen} requestClose={requestClose} children={content} />
    </div>
  );
};

const Popover = styled(PopoverInternals)<{
  verticalAlignment: "top" | "bottom" | "span-top" | "span-all" | "span-bottom";
  horizontalAlignment: "left" | "right" | "span-left" | "span-right" | "span-all";
}>`
  display: contents;
  anchor-scope: --this-anchor;

  & > .anchor {
    display: contents;
    anchor-name: --this-anchor;
  }

  & > .animateInOut {
    & > dialog {
      position: fixed;
      inset: 0;

      & > section {
        isolation: isolate;
        position-anchor: --this-anchor;
        position: fixed;
        position-area: ${({ verticalAlignment }) => verticalAlignment}
          ${({ horizontalAlignment }) => horizontalAlignment};
      }
    }
  }
`;

export default Popover;
