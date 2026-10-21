import { css } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import { FontCSS } from "components/Font.tsx";
import type { Subscription } from "hooks/useNavigationGroup.ts";
import { useCallback } from "react";

// A row in the Glass look: plain text that lifts to white under the pointer; the highlighted
// row (the one arrows point at) wears a grey outline, cream once focus is on the row itself,
// the same grey-to-cream as the field's border; the pick is bold cream on a faint cream band
// with a check.
const RowButton = styled(Button.MenuItem)<{
  isSelected: boolean;
  isHighlighted: boolean;
}>`
  ${FontCSS.Normal16}
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  color: var(--neutral-800);

  &:where(:hover:not(:disabled)),
  &:where(:active:not(:disabled)) {
    background: none;
    color: var(--neutral-900);
  }
  ${({ isHighlighted }) =>
    isHighlighted &&
    css`
      color: var(--neutral-900);
      outline: 2px solid var(--neutral-500);
      outline-offset: -2px;
    `}
  ${({ isSelected }) =>
    isSelected &&
    css`
      color: var(--cream);
      font-weight: 700;
      background: color-mix(in srgb, var(--cream) 12%, transparent);

      &::after {
        content: "";
        width: 6px;
        height: 12px;
        margin-left: auto;
        margin-right: 2px;
        border-right: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        rotate: 45deg;
        translate: 0 -2px;
      }
    `}
  &:focus-visible {
    outline: 2px solid var(--cream);
    outline-offset: -2px;
  }
`;

// One row of a DropdownField's card. `subscription` and `tabIndex` come from the field's
// navigation group and must land on the focusable element, so arrows can reach the row.
const DefaultItemRenderer = <T,>({
  item,
  isSelected,
  isHighlighted,
  tabIndex,
  subscription,
  itemToLabel,
  select,
}: {
  item: T;
  isSelected: boolean;
  // the row arrows point at: the focused one, or the one picked from the input
  isHighlighted: boolean;
  tabIndex: number;
  subscription: Subscription;
  itemToLabel: (val: T) => string;
  select: (val: T) => void;
}) => {
  const onClick = useCallback(() => select(item), [select, item]);
  return (
    <RowButton
      ref={subscription}
      tabIndex={tabIndex}
      text={itemToLabel(item)}
      onClick={onClick}
      isHighlighted={isHighlighted}
      isSelected={isSelected}
    />
  );
};

export default DefaultItemRenderer;
