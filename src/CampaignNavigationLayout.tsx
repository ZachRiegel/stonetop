import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Link from "components/Link.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import { useQuery } from "convex/react";
import knotworkPng from "icons/knotwork.png";
import treePng from "icons/tree.png";
import NavigationItemPortal from "NavigationItemPortalContext.tsx";
import { Outlet, useMatch, useParams } from "react-router";

import { api } from "../convex/_generated/api";

const CampaignTitle = styled.div`
  display: grid;
  row-gap: 2px;
`;

const CampaignNavigationLayout = () => {
  const { campaignId } = useParams();
  const campaign = useQuery(api.campaigns.get, campaignId ? { campaignId } : "skip");
  const section = useMatch("/campaign/:campaignId/:section")?.params.section;

  return (
    <>
      <NavigationItemPortal>
        <NavigationItem.Solid>
          <NavigationIcon src={knotworkPng} />
          <CampaignTitle>
            <Font.Bold24 element="div" text={campaign?.name ?? ""} />
            <Link Font={Font.Italic14} to="/" text="← My campaigns" />
          </CampaignTitle>
        </NavigationItem.Solid>
        <NavigationItem.TransparentLink to="dice">
          <NavigationIcon Icon={Icon.DieBlue} inverted={section === "dice"} />
          <Font.Bold20 element="div" text="Dice Roller" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="players">
          <NavigationIcon src={treePng} inverted={section === "players"} />
          <Font.Bold20 element="div" text="Players" />
        </NavigationItem.TransparentLink>
      </NavigationItemPortal>
      <Outlet />
    </>
  );
};

export default CampaignNavigationLayout;
