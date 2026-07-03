import { useState } from "react";
import styled from "@emotion/styled";
import { Link } from "react-router";

import {
  client,
  useObserveQuery,
  useCurrentUser,
  type CurrentUser,
  type Selected,
  type Query,
  defineQuery,
  type QueryResult,
} from "amplify.ts";

import Button from "components/Button.tsx";
import Font, { FontCSS } from "components/Font.tsx";

import CreateCampaignDialog from "pages/campaigns/CreateCampaignModal.tsx";

import background from "assets/background.svg";
import misc from "pages/campaigns/misc.png";
import footer from "pages/campaigns/footer.png";
import Icon from "components/Icon.tsx";
import _ from "lodash";

const Page = styled.div`
  min-width: 100vw;
  min-height: 100vh;

  background-image: url("${background}");
  background-size: 100% 100%;
  background-repeat: no-repeat;

  display: grid;
  grid-template-rows: 1fr max-content 1fr;
  justify-content: center;
`;

const Footer = styled.img`
  position: fixed;
  left: 0;
  right: 0;
  bottom: -20px;
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

const CampaignLabel = styled.a`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-radius: 16px;
  background-color: var(--neutral-25);
  box-shadow: var(--shadow-medium);
  cursor: pointer;
`;

const AvatarRow = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: start;
  gap: 4px;
  margin-top: 4px;
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 999px;
  object-fit: cover;
`;

const CampaignLink = styled(Link)`
  ${FontCSS.Bold20}
  align-self: start;
  color: var(--neutral-700);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

const query = defineQuery("Campaign", [
  "id",
  "name",
  "owner",
  "members",
  "characters.*",
  "characters.user.picture",
  "characters.user.id",
]);
type CampaignResult = QueryResult<typeof query>;

const Campaigns = () => {
  const campaigns = useObserveQuery(query);
  const user = useCurrentUser();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const characterLine = (campaign: CampaignResult) => {
    return !user
      ? "Loading..."
      : user.username === campaign.owner
        ? "Game Master"
        : (campaign.characters.find((character) => character.owner === user.username)?.name ??
          "No character yet");
  };

  const createCampaign = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!user) return;
    await client.models.Campaign.create({ name: trimmed, members: [user?.userId] });
    setName("");
    setCreating(false);
  };

  const cancelCreate = () => {
    setName("");
    setCreating(false);
  };

  return (
    <Page>
      <Footer src={footer} />
      <Card>
        <CardHeader>
          <Font.Bold32 element="h1" text="Campaigns" />
        </CardHeader>
        <ScrollArea>
          {!campaigns ? (
            "nothng loaded"
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
            campaigns.map((campaign) => (
              <CampaignLabel key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Font.Bold20 text={campaign.name} />
                <Font.Italic16 element="div" text={characterLine(campaign)} />

                {!!campaign.characters.length && (
                  <AvatarRow>
                    {_.chain(campaign.characters)
                      .map((character) => character.user)
                      .uniqBy((user) => user.id)
                      .filter((user) => !!user.picture)
                      .map((user) => <Avatar key={user.id} src={user.picture!} alt={""} />)
                      .value()}
                  </AvatarRow>
                )}
              </CampaignLabel>
            ))
          )}
        </ScrollArea>
        <CardBottom>
          <Button.Primary
            Icon={Icon.Plus}
            text="Create campaign"
            onClick={() => setCreating(true)}
          />
        </CardBottom>
      </Card>
      <CreateCampaignDialog
        isOpen={creating}
        name={name}
        onNameChange={setName}
        onCreate={createCampaign}
        close={cancelCreate}
      />
    </Page>
  );
};

export default Campaigns;
