import type { Tab } from "components/TabRow.tsx";
import { createContext, type Dispatch, type SetStateAction } from "react";

// What a layout under AuthenticatedLayout puts in the navigation: the campaign it is in, if
// any, and its sections, which the strip across the top draws as tabs (README.md here). The
// way home is the strip's own mark, so a campaign needs only its name; the open section is
// the router's to say (TabRow matches each tab's path).
export type Navigation = {
  campaign?: { name: string };
  sections: Tab[];
};

// the setter AuthenticatedLayout provides; a layout sets its navigation with
// hooks/useNavigation.ts and clears it as it unmounts
export const NavigationContext = createContext<Dispatch<SetStateAction<Navigation | undefined>>>(
  () => undefined,
);
