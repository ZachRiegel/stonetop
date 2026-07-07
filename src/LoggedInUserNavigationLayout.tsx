import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import circleOutlinePng from "icons/circleOutline.png";
import knotworkPng from "icons/knotwork.png";
import playbooksPng from "icons/playbooks.png";
import standingStonePng from "icons/standingStone.png";
import NavigationItemPortal from "NavigationItemPortalContext.tsx";
import { Outlet, useMatch } from "react-router";

const NavigationIcon = styled.div<{ inverted?: boolean }>`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;

  &::before,
  &::after {
    grid-area: 1 / 1;
    background-color: var(--neutral-500);
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
  }

  ${({ inverted }) =>
    inverted &&
    css`
      opacity: 0.8;
      background-color: var(--neutral-900);
      border-radius: 999px;

      &::before,
      &::after {
        background-color: var(--neutral-0);
      }
    `}
`;

const CampaignsIcon = styled(NavigationIcon)`
  &::before {
    content: "";
    width: 40px;
    height: 40px;
    mask-image: url("${circleOutlinePng}");
  }

  &::after {
    content: "";
    width: 32px;
    height: 32px;
    mask-image: url("${knotworkPng}");
  }
`;

/* the book art is white-on-black with no alpha channel, hence luminance masks */
const MyCharactersIcon = styled(NavigationIcon)`
  &::before {
    content: "";
    width: 40px;
    height: 40px;
    mask-image: url("${playbooksPng}");
    mask-mode: luminance;
  }
`;

const AboutStonetopIcon = styled(NavigationIcon)`
  &::before {
    content: "";
    width: 40px;
    height: 40px;
    mask-image: url("${standingStonePng}");
    mask-mode: luminance;
  }
`;

const LoggedInUserNavigationLayout = () => {
  return (
    <>
      <NavigationItemPortal>
        <NavigationItem.TransparentLink to="/campaigns">
          <CampaignsIcon inverted={useMatch("/") !== null} />
          <Font.Bold20 element="div" text="Campaigns" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="/characters">
          <MyCharactersIcon inverted={useMatch("/characters") !== null} />
          <Font.Bold20 element="div" text="Characters" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="/about">
          <AboutStonetopIcon inverted={useMatch("/about") !== null} />
          <Font.Bold20 element="div" text="About Stonetop" />
        </NavigationItem.TransparentLink>
      </NavigationItemPortal>
      <Outlet />
    </>
  );
};

export default LoggedInUserNavigationLayout;
