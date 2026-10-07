import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import Loading from "components/Loading.tsx";
import { useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import footer from "pages/campaigns/footer.png";
import misc from "pages/campaigns/misc.png";
import InvitePlayers from "pages/players/InvitePlayers.tsx";
import { useParams } from "react-router";

import { api } from "../../../convex/_generated/api";

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;

  display: grid;
  grid-template-rows: 1fr max-content 1fr;
  justify-content: center;
`;

const Footer = styled.img`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -32px;
  width: 100vw;
  object-fit: cover;
  object-position: top;
  aspect-ratio: 2301 / 844;
  mix-blend-mode: screen;
  max-height: 600px;
  opacity: 0.7;
`;

const Card = styled.div`
  grid-row: 2;
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - 32px));
  border-radius: 16px;
  background-color: var(--neutral-75);
  overflow: hidden;
  box-shadow: 8px 8px 12px 12px rgba(0 0 0 / 0.3);
  isolation: isolate;
`;

const CardHeader = styled.div`
  padding: 12px 20px;
`;

const ScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 340px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 8px scrollbar gutter (styled globally in RootLayout) + 12px right
     padding = 20px, matching CardHeader */
  padding: 12px 12px 12px 20px;
  scrollbar-gutter: stable;
  border-top: 2px solid var(--neutral-100);
`;

const EmptyState = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;

  img {
    height: 232px;
    aspect-ratio: 648 / 828;
    mix-blend-mode: screen;
  }
`;

const CardBottom = styled.div`
  display: grid;
  padding: 16px 20px;
  border-top: 2px solid var(--neutral-100);
`;

const PlayerLabel = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-auto-rows: max-content;
  column-gap: 12px;
  row-gap: 2px;
  align-items: center;
  padding: 12px 12px 12px 16px;
  border-radius: 16px;
  background-color: var(--neutral-25);
  box-shadow: var(--shadow-medium);
`;

const Avatar = styled.img`
  grid-row: span 2;
  width: 30px;
  height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

const Players = () => {
  const { campaignId } = useParams();
  // null means the caller is not a member; the server lists the Game Master first
  const campaign = useQuery(api.campaigns.get, campaignId ? { campaignId } : "skip");
  const isLoading = useMinimumLoading(campaign === undefined);

  return (
    <Page>
      <Footer src={footer} />
      <Card>
        <CardHeader>
          <Font.Bold32 element="h1" text="Players" />
        </CardHeader>
        <ScrollArea>
          {isLoading || campaign === undefined ? (
            <Loading.Medium />
          ) : campaign === null ? (
            <EmptyState>
              <img src={misc} alt="" />
              <Font.Italic16 element="div" text="You are not a member of this campaign." />
            </EmptyState>
          ) : (
            campaign.members.map((player) => (
              <PlayerLabel key={player._id}>
                <Avatar src={player.picture} alt={player.displayName} />
                <Font.Bold20 text={player.displayName} />
                <Font.Italic16
                  element="div"
                  text={
                    player.isOwner ? "Game Master" : (player.character?.name ?? "No character yet")
                  }
                />
              </PlayerLabel>
            ))
          )}
        </ScrollArea>
        {campaign?.inviteToken && (
          <CardBottom>
            <InvitePlayers campaignId={campaign._id} inviteToken={campaign.inviteToken} />
          </CardBottom>
        )}
      </Card>
    </Page>
  );
};

export default Players;
