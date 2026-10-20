import type { Glyph } from "components/NavigationIcon.tsx";
import { createContext, type Dispatch, type SetStateAction } from "react";

export type NavigationSection = { to: string; text: string; glyph: Glyph; active: boolean };

// What a layout under AuthenticatedLayout puts in the navigation: the campaign it is in, if
// any (its name, and the way back to the campaign list), and its sections. The sidebar on a
// desktop and the row and panel on a phone or tablet both draw from it (README.md here).
export type Navigation = {
  campaign?: {
    name: string;
    // the campaign's own mark, which the folded sidebar shows in its place
    glyph: Glyph;
    back: { to: string; text: string; glyph: Glyph };
  };
  sections: NavigationSection[];
};

// the setter AuthenticatedLayout provides; a layout sets its navigation with
// hooks/useNavigation.ts and clears it as it unmounts
export const NavigationContext = createContext<Dispatch<SetStateAction<Navigation | undefined>>>(
  () => undefined,
);
