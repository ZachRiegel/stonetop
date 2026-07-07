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
  className?: string;
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
  gap?: number;
  verticalAlignment: "top" | "bottom" | "span-top" | "span-all" | "span-bottom";
  horizontalAlignment: "left" | "right" | "span-left" | "span-right" | "span-all";
}>`
  cursor: default;
  display: contents;
  anchor-scope: --this-anchor;

  & > .anchor {
    display: contents;

    /* anchor-name needs a real box; display: contents generates none */
    & > *:first-child {
      anchor-name: --this-anchor;
    }
  }

  & > .animateInOut {
    & > dialog {
      position: fixed;
      inset: 0;

      &::backdrop {
        opacity: 0;
      }

      & > section {
        /* gap only on the edge facing the anchor; span alignments overlap it */
        margin: ${({ gap = 4, verticalAlignment, horizontalAlignment }) =>
          `${verticalAlignment === "bottom" ? gap : 0}px ${
            horizontalAlignment === "left" ? gap : 0
          }px ${verticalAlignment === "top" ? gap : 0}px ${
            horizontalAlignment === "right" ? gap : 0
          }px`};
        width: anchor-size(width);
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
