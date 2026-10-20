import Icon from "components/Icon.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useNavigation from "hooks/useNavigation.ts";
import knotworkPng from "icons/knotwork.png";
import standingStonePng from "icons/standingStone.png";
import treePng from "icons/tree.png";
import { useMemo } from "react";
import { Outlet, useMatch, useParams } from "react-router";

const CampaignNavigationLayout = () => {
  const { campaignId } = useParams();
  const campaign = useQuery(api.campaigns.get, campaignId ? { campaignId } : "skip");
  const section = useMatch("/campaign/:campaignId/:section")?.params.section;
  const name = campaign?.name ?? "";

  // absolute paths: the links are rendered by the layout above this route, where a relative
  // one would resolve against the wrong route
  useNavigation(
    useMemo(
      () => ({
        campaign: {
          name,
          glyph: { src: knotworkPng },
          back: { to: "/", text: "Home", glyph: { src: standingStonePng } },
        },
        sections: [
          {
            to: `/campaign/${campaignId}/dice`,
            text: "Dice Roller",
            glyph: { Icon: Icon.DieBlue },
            active: section === "dice",
          },
          {
            to: `/campaign/${campaignId}/players`,
            text: "Players",
            glyph: { src: treePng },
            active: section === "players",
          },
        ],
      }),
      [campaignId, name, section],
    ),
  );

  return <Outlet />;
};

export default CampaignNavigationLayout;
