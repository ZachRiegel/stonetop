import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { generateClient } from "aws-amplify/data";

import type { Schema } from "../../../amplify/data/resource";

import Button from "components/Button.tsx";
import Font from "components/Font.tsx";

import CreateCampaignDialog from "pages/campaigns/CreateCampaignForm.tsx";

import background from "assets/background.png";

const client = generateClient<Schema>();

type Campaign = Schema["Campaign"]["type"];

const Page = styled.div`
  display: flow-root;
  min-width: 100vw;
  min-height: 100vh;
  background-image: url(${background});
  background-size: auto;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding-top: 12vh;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 320px;
`;

const CampaignRow = styled.div`
  padding: 16px 20px;
  border-radius: 16px;
  background: var(--neutral-0);
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
      <Content>
        <h1>
          <Font.Title64 text="Campaigns" />
        </h1>
        <List>
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign.id}>
              <Font.Semibold20 element="div" text={campaign.name} />
            </CampaignRow>
          ))}
        </List>
        <Button text="Create campaign" onClick={() => setCreating(true)} />
        <CreateCampaignDialog
          isOpen={creating}
          name={name}
          onNameChange={setName}
          onCreate={createCampaign}
          close={cancelCreate}
        />
      </Content>
    </Page>
  );
};

export default Campaigns;
