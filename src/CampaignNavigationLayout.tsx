import Icon from "components/Icon.tsx";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import useNavigation from "hooks/useNavigation.ts";
import knotworkPng from "icons/knotwork.png";
import playbooksPng from "icons/playbooks.png";
import treePng from "icons/tree.png";
import type { Navigation } from "navigation/NavigationContext.tsx";
import { useMemo } from "react";
import { Outlet, useParams } from "react-router";

// a campaign's pages: each tab but Overview carries the paper of its poster on the overview
const CampaignNavigationLayout = () => {
  const { campaignId } = useParams();
  const campaign = useQuery(api.campaigns.get, campaignId ? { campaignId } : "skip");
  const name = campaign?.name ?? "";

  useNavigation(
    useMemo((): Navigation => {
      const base = `/campaign/${campaignId}`;
      return {
        campaign: { name },
        sections: [
          { to: base, text: "Overview", glyph: { src: knotworkPng } },
          { to: `${base}/dice`, text: "Table", glyph: { Icon: Icon.Die }, paper: "blue" },
          {
            to: `${base}/character`,
            text: "Character",
            glyph: { src: playbooksPng },
            paper: "purple",
          },
          { to: `${base}/players`, text: "Players", glyph: { src: treePng }, paper: "orange" },
        ],
      };
    }, [campaignId, name]),
  );

  return <Outlet />;
};

export default CampaignNavigationLayout;
