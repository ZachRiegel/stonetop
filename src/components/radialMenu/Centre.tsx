import type { ReactElement } from "react";

export type CentreProps = {
  // the item's size in px, the cell it fills and what the pointer is measured from
  diameter: number;
  // the item, a labelled round button: it is told it has the menu (aria-haspopup,
  // aria-expanded) and, disabled, does not open it
  children: ReactElement<{
    disabled?: boolean;
    "aria-haspopup"?: "menu";
    "aria-expanded"?: boolean;
  }>;
};

// The centre of a RadialMenu, which its Rings are placed round: a description only, read
// and drawn by RadialMenu.tsx (README.md)
const Centre = (_: CentreProps) => null;

export default Centre;
