import { type Navigation, NavigationContext } from "navigation/NavigationContext.tsx";
import { use, useEffect } from "react";

// Puts a layout's campaign and sections in the navigation while it is mounted. The
// navigation is set again whenever it changes identity, so callers memoize it.
const useNavigation = (navigation: Navigation) => {
  const set = use(NavigationContext);
  useEffect(() => {
    set(navigation);
    return () => set(undefined);
  }, [navigation, set]);
};

export default useNavigation;
