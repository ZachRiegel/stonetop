import { createContext, type ReactNode, use } from "react";
import { createPortal } from "react-dom";

// Where content that must escape its ancestors (a dropdown's card, say) is portaled to: the
// nearest open dialog provides its own mount node (components/DialogInternals.tsx), so the
// content stays in the top layer and out of the inert page. `undefined` is no provider at
// all, and the body serves; `null` is a provider whose node is not attached yet, and the
// content waits rather than spend a frame under the dialog's backdrop.
export const PortalTargetContext = createContext<HTMLElement | null | undefined>(undefined);

const Portal = ({ children }: { children: ReactNode }) => {
  const target = use(PortalTargetContext);
  if (target === null) return null;
  return createPortal(children, target ?? document.body);
};

export default Portal;
