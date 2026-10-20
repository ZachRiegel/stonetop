import useNavigation from "hooks/useNavigation.ts";
import knotworkPng from "icons/knotwork.png";
import playbooksPng from "icons/playbooks.png";
import standingStonePng from "icons/standingStone.png";
import { useMemo } from "react";
import { Outlet, useMatch } from "react-router";

const LoggedInUserNavigationLayout = () => {
  const home = useMatch("/") !== null;
  const characters = useMatch("/characters") !== null;
  const about = useMatch("/about") !== null;

  useNavigation(
    useMemo(
      () => ({
        sections: [
          { to: "/campaigns", text: "Campaigns", glyph: { src: knotworkPng }, active: home },
          {
            to: "/characters",
            text: "Characters",
            glyph: { src: playbooksPng },
            active: characters,
          },
          { to: "/about", text: "About Stonetop", glyph: { src: standingStonePng }, active: about },
        ],
      }),
      [home, characters, about],
    ),
  );

  return <Outlet />;
};

export default LoggedInUserNavigationLayout;
