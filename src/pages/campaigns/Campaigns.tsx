import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "../../../amplify/data/resource";

import Button from "components/Button.tsx";
import Font from "components/Font.tsx";

import CreateCampaignDialog from "pages/campaigns/CreateCampaignForm.tsx";

import background from "assets/background.svg";
import misc from "pages/campaigns/misc.png";
import Icon from "components/Icon.tsx";

const client = generateClient<Schema>();

type Campaign = Schema["Campaign"]["type"];

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

const Card = styled.div`
  grid-row: 2;
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - 32px));
  max-height: 70vh;
  border-radius: 16px;
  background-color: var(--neutral-75);
  overflow: hidden;
  box-shadow: 8px 8px 12px 12px rgba(0 0 0 / 0.3);
`;

const CardHeader = styled.div`
  padding: 12px 20px;
`;

const ScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 20px;
  scrollbar-color: var(--neutral-300) transparent;
  scrollbar-width: thin;
  border-top: 1px solid var(--neutral-100);
  border-bottom: 1px solid var(--neutral-100);
`;

const EmptyState = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;

  img {
    width: min(200px, 60%);
    mix-blend-mode: screen;
  }
`;

const CardBottom = styled.div`
  display: flex;
  padding: 16px 24px;
`;

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const subscription = client.models.Campaign.observeQuery().subscribe({
      next: ({ items }) => setCampaigns([...items]),
    });
    return () => subscription.unsubscribe();
  }, []);

  const createCampaign = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await client.models.Campaign.create({ name: trimmed });
    setName("");
    setCreating(false);
  };

  const cancelCreate = () => {
    setName("");
    setCreating(false);
  };

  return (
    <Page>
      <Card>
        <CardHeader>
          <Font.Bold32 element="h1" text="Campaigns" />
        </CardHeader>
        <ScrollArea>
          {campaigns.length === 0 ? (
            <EmptyState>
              <img src={misc} alt="" />
              <Font.Italic16 text="Would you like to start a new adventure?" />
            </EmptyState>
          ) : (
            campaigns.map((campaign) => (
              <Button.Secondary
                key={campaign.id}
                text={campaign.name}
                onClick={() => {}} // TODO: navigate to campaign page
              />
            ))
          )}
        </ScrollArea>
        <CardBottom>
          <Button.Primary
            icon={Icon.Plus}
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
