import Font from "components/Font.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import knotworkPng from "icons/knotwork.png";
import playbooksPng from "icons/playbooks.png";
import standingStonePng from "icons/standingStone.png";
import NavigationItemPortal from "NavigationItemPortalContext.tsx";
import { Outlet, useMatch } from "react-router";

const LoggedInUserNavigationLayout = () => {
  return (
    <>
      <NavigationItemPortal>
        <NavigationItem.TransparentLink to="/campaigns">
          <NavigationIcon src={knotworkPng} inverted={useMatch("/") !== null} />
          <Font.Bold20 element="div" text="Campaigns" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="/characters">
          <NavigationIcon src={playbooksPng} inverted={useMatch("/characters") !== null} />
          <Font.Bold20 element="div" text="Characters" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="/about">
          <NavigationIcon src={standingStonePng} inverted={useMatch("/about") !== null} />
          <Font.Bold20 element="div" text="About Stonetop" />
        </NavigationItem.TransparentLink>
      </NavigationItemPortal>
      <Outlet />
    </>
  );
};

export default LoggedInUserNavigationLayout;
