import styled from "@emotion/styled";

import MakeDialog from "hoc/MakeDialog.tsx";
import Modal from "components/Modal.tsx";
import Button from "components/Button.tsx";
import Input from "components/Input.tsx";
import Font from "components/Font.tsx";
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

const Actions = styled.div`
  display: flex;
  height: max-content;
  gap: 8px;
`;

const CreateCampaignModal = ({
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
    <CardHeader>
      <Font.Bold32 element="h2" text="New Campaign" />
    </CardHeader>
    <CardBody>
      <Input value={name} onChange={(value) => onNameChange(value)} label="Campaign name" />
    </CardBody>
    <CardFooter>
      <ButtonRow>
        <Button.Secondary text="Cancel" onClick={close} />
        <Button.Primary text="Create" onClick={onCreate} />
      </ButtonRow>
    </CardFooter>
  </Card>
);

export default MakeDialog("isOpen", CreateCampaignModal, Modal);
