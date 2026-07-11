import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "components/Button.tsx";

const RowButton = styled(Button.MenuItem)<{
  isSelected: boolean;
  isHighlighted: boolean;
}>`
  ${({ isSelected }) =>
    isSelected &&
    css`
      color: var(--neutral-600);
    `}
  ${({ isHighlighted }) =>
    isHighlighted &&
    css`
      background-color: var(--neutral-100);
    `}
`;

const DefaultItemRenderer = <T, U>({
  item,
  isHighlighted,
  selectedItem,
  itemToValue,
  itemToLabel,
  select,
}: {
  item: T;
  isHighlighted: boolean;
  selectedItem: U | undefined;
  itemToLabel: (val: T) => string;
  itemToValue: (val: T) => U;
  select: (val: T) => void;
  query?: string;
}) => {
  const isSelected = selectedItem === itemToValue(item);
  return (
    <RowButton
      text={itemToLabel(item)}
      onClick={() => select(item)}
      isHighlighted={isHighlighted}
      isSelected={isSelected}
    />
  );
};

export default DefaultItemRenderer;
