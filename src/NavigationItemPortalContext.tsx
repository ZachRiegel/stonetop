import { createContext, use, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Holds the left-nav item list element; children portal into it to add nav items.
export const NavigationItemPortalContext = createContext<HTMLElement | null>(null);

const NavigationItemPortal = ({ children }: { children: ReactNode }) => {
  const target = use(NavigationItemPortalContext);
  return target ? createPortal(children, target) : null;
};

export default NavigationItemPortal;
