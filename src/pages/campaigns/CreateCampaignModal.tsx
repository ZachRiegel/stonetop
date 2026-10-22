import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import ButtonRow from "components/ButtonRow.tsx";
import Font from "components/Font.tsx";
import Input from "components/Input.tsx";
import Modal from "components/Modal.tsx";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import MakeDialog from "hoc/MakeDialog.tsx";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

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

// a phone's width less the modal's 16px margins, up to the card's own
const Card = styled.div`
  display: grid;
  grid-template-rows: max-content max-content 1fr;
  width: min(360px, calc(100vw - 32px));
  border-radius: 16px;
  background: var(--neutral-75);

  & > *:last-child {
    align-self: flex-end;
  }
`;

const CreateCampaignModal = ({ requestClose }: { isOpen: boolean; requestClose: () => void }) => {
  const createCampaign = useMutation(api.campaigns.create);
  const navigate = useNavigate();
  const [name, setName] = useState("");

  // a new campaign is entered at once (user, 2026-10-21): the list would only show it to be
  // clicked, and the overview greets the Game Master with the invite card
  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const campaignId = await createCampaign({ name: trimmed });
    setName("");
    requestClose();
    navigate(`/campaign/${campaignId}`);
  }, [name, createCampaign, requestClose, navigate]);

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
          <Button.Primary text="Create" onClick={submit} />
        </ButtonRow>
      </CardFooter>
    </Card>
  );
};

export default MakeDialog("isOpen", CreateCampaignModal, Modal);
