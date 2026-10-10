import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import Loading from "components/Loading.tsx";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import useModal from "hooks/useModal.ts";
import CreateCampaignDialog from "pages/campaigns/CreateCampaignModal.tsx";
import footer from "pages/campaigns/footer.png";
import misc from "pages/campaigns/misc.png";
import { useEffect, useMemo, useRef } from "react";
import { Link as ReactRouterLink, useNavigate, useSearchParams } from "react-router";

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
     padding = 20px, matching CardBottom */
  padding: 12px 12px 12px 20px;
  scrollbar-gutter: stable;
  border-top: 2px solid var(--neutral-100);
  border-bottom: 2px solid var(--neutral-100);
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
  display: flex;
  padding: 16px 20px;
`;

const CampaignLabel = styled(ReactRouterLink)`
  color: inherit;
  text-decoration: none;
  display: grid;
  grid-template-columns: 1fr max-content;
  grid-auto-rows: max-content;
  column-gap: 16px;
  align-items: center;
  row-gap: 2px;
  padding: 12px 12px 12px 16px;
  border-radius: 16px;
  background-color: var(--neutral-25);
  box-shadow: var(--shadow-medium);
  cursor: pointer;
`;

const AvatarRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  margin-top: 4px;
`;

const AvatarContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  overflow: visible;
  width: 15px;
  height: 30px;
`;

const Avatar = styled.img`
  min-width: 30px;
  min-height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

const Campaigns = () => {
  const campaigns = useQuery(api.campaigns.list);
  const join = useMutation(api.campaigns.join);
  const navigate = useNavigate();
  const createModal = useModal();
  const [searchParams] = useSearchParams();
  const joined = useRef(false);

  // Use a pending invite once, on mount. The token arrives in the URL, or in
  // sessionStorage when the sign-in redirect dropped it from the URL.
  useEffect(() => {
    const inviteToken = searchParams.get("inviteLinkId") ?? sessionStorage.getItem("inviteLinkId");
    sessionStorage.removeItem("inviteLinkId");
    if (!inviteToken || joined.current) return;
    joined.current = true;
    join({ inviteToken }).then(
      (campaignId) => navigate(`/campaign/${campaignId}`, { replace: true }),
      () => navigate("/?invite=invalid", { replace: true }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount; re-running on later renders would join/navigate again
  }, []);

  const isLoading = useMinimumLoading(!campaigns);

  const campaignEntries = useMemo(
    () =>
      campaigns?.map((campaign) => (
        <CampaignLabel key={campaign._id} to={`/campaign/${campaign._id}`}>
          <Font.Bold20 text={campaign.name} />
          <AvatarRow>
            {campaign.members.map((member) => (
              <AvatarContainer key={member._id}>
                <Avatar src={member.picture} alt={member.displayName} />
              </AvatarContainer>
            ))}
          </AvatarRow>
          <Font.Italic16
            element="div"
            text={
              campaign.isOwner ? "Game Master" : (campaign.myCharacter?.name ?? "No character yet")
            }
          />
        </CampaignLabel>
      )),
    [campaigns],
  );

  return (
    <Page>
      <Footer src={footer} />
      <Card>
        <CardHeader>
          <Font.Bold32 element="h1" text="Campaigns" />
          {searchParams.get("invite") === "invalid" && (
            <Font.Italic16
              element="div"
              text="That invite link is no longer valid. Ask your Game Master for a new one."
            />
          )}
        </CardHeader>
        <ScrollArea>
          {isLoading || !campaigns ? (
            <Loading.Medium />
          ) : campaigns.length === 0 ? (
            <EmptyState>
              <img src={misc} alt="" />
              <Font.Italic16
                element="div"
                text={`You aren't a member of any campaigns yet.
Ask your Game Master to invite you or create one.`}
              />
            </EmptyState>
          ) : (
            campaignEntries
          )}
        </ScrollArea>
        <CardBottom>
          <Button.Primary Icon={Icon.Plus} text="Create campaign" onClick={createModal.open} />
        </CardBottom>
      </Card>
      <CreateCampaignDialog isOpen={createModal.isOpen} requestClose={createModal.close} />
    </Page>
  );
};

export default Campaigns;
