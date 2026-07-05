import styled from "@emotion/styled";
import { useClient, useCurrentUser } from "amplify.ts";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Input from "components/Input.tsx";
import Modal from "components/Modal.tsx";
import MakeDialog from "hoc/MakeDialog.tsx";
import { useState } from "react";

import ButtonRow from "../../components/ButtonRow.tsx";

const CardHeader = styled.div`
  padding: 12px 20px;
`;

const CardBody = styled.div`
  padding: 20px;
  height: 340px;
  border-top: 2px solid var(--neutral-100);
  border-bottom: 2px solid var(--neutral-100);
`;

const CardFooter = styled.div`
  padding: 16px 20px;
`;

const Card = styled.div`
  display: grid;
  grid-template-rows: max-content max-content 1fr;
  flex-direction: column;
  width: 360px;
  border-radius: 16px;
  background: var(--neutral-75);

  & > *:last-child {
    align-self: flex-end;
  }
`;

const CreateCampaignModal = ({ requestClose }: { isOpen: boolean; requestClose: () => void }) => {
  const client = useClient();
  const user = useCurrentUser();
  const [name, setName] = useState("");

  const createCampaign = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!user) return;
    await client.models.Campaign.create({ name: trimmed });
    setName("");
    requestClose();
  };

  return (
    <Card>
      <CardHeader>
        <Font.Bold32 element="h2" text="New Campaign" />
      </CardHeader>
      <CardBody>
        <Input value={name} onChange={setName} label="Campaign name" />
      </CardBody>
      <CardFooter>
        <ButtonRow>
          <Button.Secondary text="Cancel" onClick={requestClose} />
          <Button.Primary text="Create" onClick={createCampaign} />
        </ButtonRow>
      </CardFooter>
    </Card>
  );
};

export default MakeDialog("isOpen", CreateCampaignModal, Modal);
