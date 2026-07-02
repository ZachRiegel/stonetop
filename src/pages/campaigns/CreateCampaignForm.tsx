import styled from "@emotion/styled";

import MakeDialog from "hoc/MakeDialog.tsx";
import Modal from "components/Modal.tsx";
import Button from "components/Button.tsx";
import Input from "components/Input.tsx";
import Font from "components/Font.tsx";

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 320px;
  padding: 24px;
  border-radius: 16px;
  background: var(--neutral-0);
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
`;

const CreateCampaignForm = ({
  name,
  onNameChange,
  onCreate,
  close,
}: {
  isOpen: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onCreate: () => void;
  close: () => void;
}) => (
  <Card>
    <Font.Bold24 element="h2" text="Create campaign" />
    <Input value={name} onChange={(value) => onNameChange(value)} placeholder="Campaign name" />
    <Actions>
      <Button.Primary text="Create" onClick={onCreate} />
      <Button.Secondary text="Cancel" onClick={close} />
    </Actions>
  </Card>
);

export default MakeDialog("isOpen", CreateCampaignForm, Modal);
