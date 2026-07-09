import styled from "@emotion/styled";
import Font from "components/Font.tsx";
import discordProfilePictureForUser from "utils/discordProfilePictureForUser.ts";

const Row = styled.div<{ isHighlighted: boolean }>`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-auto-rows: max-content;
  column-gap: 12px;
  row-gap: 2px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: ${({ isHighlighted }) =>
    isHighlighted ? "var(--neutral-200)" : "transparent"};

  &:hover {
    background-color: var(--neutral-200);
  }
`;

const Avatar = styled.img`
  grid-row: span 2;
  width: 30px;
  height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

const PlayerOption = ({
  item,
  isHighlighted,
}: {
  item: { id: string; name?: string | null; picture?: string | null; isMember: boolean };
  isHighlighted: boolean;
}) => (
  <Row isHighlighted={isHighlighted}>
    <Avatar src={discordProfilePictureForUser(item)} alt="" />
    <Font.Bold16 text={item.name ?? "Unknown user"} />
    {item.isMember && <Font.Italic16 element="div" text="Already part of this campaign" />}
  </Row>
);

export default PlayerOption;
