import styled from "@emotion/styled";
import { defineQuery, useObserveQuery } from "amplify.ts";
import Font from "components/Font.tsx";
import Link from "components/Link.tsx";
import NavigationIcon from "components/NavigationIcon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import fistPng from "icons/fist.png";
import flagPng from "icons/flag.png";
import knotworkPng from "icons/knotwork.png";
import targetPng from "icons/target.png";
import treePng from "icons/tree.png";
import wolfPng from "icons/wolf.png";
import NavigationItemPortal from "NavigationItemPortalContext.tsx";
import { useMemo } from "react";
import { Outlet, useMatch, useParams } from "react-router";

const CampaignTitle = styled.div`
  display: grid;
  row-gap: 2px;
`;

const CampaignNavigationLayout = () => {
  const { campaignId } = useParams();
  const query = useMemo(
    () => defineQuery("Campaign", ["id", "name"], { id: { eq: campaignId } }),
    [campaignId],
  );
  const campaign = useObserveQuery(query)?.[0];
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
        <NavigationItem.TransparentLink to="scenario">
          <NavigationIcon src={flagPng} inverted={section === "scenario"} />
          <Font.Bold20 element="div" text="Scenario" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="characters">
          <NavigationIcon src={fistPng} inverted={section === "characters"} />
          <Font.Bold20 element="div" text="Characters" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="quests">
          <NavigationIcon src={targetPng} inverted={section === "quests"} />
          <Font.Bold20 element="div" text="Quests" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="npcs">
          <NavigationIcon src={wolfPng} inverted={section === "npcs"} />
          <Font.Bold20 element="div" text="NPCs" />
        </NavigationItem.TransparentLink>
        <NavigationItem.TransparentLink to="locations">
          <NavigationIcon src={treePng} inverted={section === "locations"} />
          <Font.Bold20 element="div" text="Locations" />
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
