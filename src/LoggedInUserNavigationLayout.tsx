import Icon from "components/Icon.tsx";
import useNavigation from "hooks/useNavigation.ts";
import knotworkPng from "icons/knotwork.png";
import standingStonePng from "icons/standingStone.png";
import type { Navigation } from "navigation/NavigationContext.tsx";
import { Outlet } from "react-router";

// the base pages: each tab but Home carries the paper of its poster on the home wall
const SECTIONS: Navigation = {
  sections: [
    { to: "/", text: "Home", glyph: { src: standingStonePng } },
    { to: "/campaigns", text: "Campaigns", glyph: { src: knotworkPng }, paper: "blue" },
    { to: "/rules", text: "Rules", glyph: { Icon: Icon.Book2 }, paper: "orange" },
    { to: "/about", text: "About", glyph: { src: standingStonePng }, paper: "purple" },
  ],
};

const LoggedInUserNavigationLayout = () => {
  useNavigation(SECTIONS);
  return <Outlet />;
};

export default LoggedInUserNavigationLayout;
