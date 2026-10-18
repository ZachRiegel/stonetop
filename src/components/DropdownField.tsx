import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import Input from "components/Input.tsx";
import DefaultItemRenderer from "components/internals/DefaultItemRenderer.tsx";
import Loading from "components/Loading.tsx";
import AnimateInOut from "hoc/AnimateInOut.tsx";
import useFocusWithin from "hooks/useFocusWithin.ts";
import useNavigationGroup from "hooks/useNavigationGroup.ts";
import useNonNullable from "hooks/useNonNullable.ts";
import * as React from "react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

const fadeIn = keyframes`
  from {
    opacity: 0;
    border-color: var(--neutral-500);
  }
`;
const fadeOut = keyframes`
  to {
    opacity: 0;
    border-color: var(--neutral-500);
  }
`;

// The card under the field, anchored to it: glass ringed in cream, fading in from the grey of
// the field's resting border as that border turns cream, and out the same way (AnimateInOut
// keeps it mounted meanwhile).
const Card = AnimateInOut(
  "isOpen",
  styled.div<{ isOpen: boolean }>`
    position: fixed;
    position-anchor: --dropdown-anchor;
    position-area: bottom;
    position-try-fallbacks: flip-block;
    width: anchor-size(width);
    margin-top: 8px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 1;

    display: grid;
    padding: 6px;
    border: 2px solid var(--cream);
    border-radius: 12px;
    background: rgb(0 0 0 / 0.55);
    backdrop-filter: blur(6px);
    box-shadow: var(--shadow-medium);
    animation: ${({ isOpen }) => (isOpen ? fadeIn : fadeOut)} 200ms ease both;
  `,
);

const DropdownFieldInternals = <T, U>({
  items,
  selectedItem,
  itemToValue: _itemToValue,
  itemToLabel: _itemToLabel,
  ItemRenderer = DefaultItemRenderer,
  setSelectedItem,
  query,
  setQuery,
  isLoading,
  emptyState,
  label,
  placeholder,
  className,
}: {
  items: T[];
  selectedItem: U | undefined;
  setSelectedItem: (item: U) => void;
  itemToLabel: (T extends string ? undefined : never) | ((item: T) => string);
  itemToValue: (T extends U ? undefined : never) | ((item: T) => U);
  ItemRenderer?: typeof DefaultItemRenderer<T>;
  query: string;
  setQuery: (query: string) => void;
  isLoading?: boolean;
  emptyState: ReactNode;
  label?: string;
  placeholder?: string;
  className?: string;
}) => {
  const itemToLabel = useCallback(
    (item: T): string => _itemToLabel?.(item) ?? (item as string),
    [_itemToLabel],
  );
  const itemToValue = useCallback(
    (item: T): U => _itemToValue?.(item) ?? (item as unknown as U),
    [_itemToValue],
  );

  // Hide the card after a selection until the user types/arrows/refocuses.
  const [isDismissed, setIsDismissed] = useState(false);
  const [focusRef, isFocused] = useFocusWithin();
  useEffect(() => {
    if (!isFocused) setIsDismissed(false);
  }, [isFocused]);

  const _matchingItem = useMemo(
    () => items.find((item) => itemToValue(item) === selectedItem),
    [itemToValue, items, selectedItem],
  );
  const matchingItem = useNonNullable(_matchingItem);

  // the whole list while the text is still the pick's label, so a reopened field offers the
  // alternatives rather than the one match
  const filtered = useMemo(
    () =>
      _matchingItem !== undefined && query === itemToLabel(_matchingItem)
        ? items
        : items.filter((item) =>
            itemToLabel(item).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
          ),
    [_matchingItem, itemToLabel, items, query],
  );

  // The input is the group's controller: arrows there highlight a row without leaving the
  // text, Tab lands on the highlighted row, and from there arrows move real focus. `loop`
  // keeps the wrap-around at either end of the list.
  const [rows, controller] = useNavigationGroup(
    filtered,
    (item) => itemToValue(item) === selectedItem,
    { loop: true },
  );
  const input = useRef<HTMLInputElement>(null);
  const inputRef = useCallback(
    (element: HTMLInputElement | null) => {
      input.current = element;
      controller(element);
    },
    [controller],
  );

  // the text follows the pick; `matchingItem` holds the last pick while the items reload
  useEffect(() => {
    setQuery(matchingItem === undefined ? "" : itemToLabel(matchingItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  const select = useCallback(
    (item: T) => {
      setIsDismissed(true);
      setSelectedItem(itemToValue(item));
      // a row picked while focused unmounts under focus with no blur, leaving focus on body
      input.current?.focus();
    },
    [itemToValue, setSelectedItem],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        // the group moves the highlight; this only brings back a dismissed card. The group
        // hears the key first (capture), before the card is back, so the press that reopens
        // it moves nothing and the next one highlights.
        setIsDismissed(false);
      } else if (event.key === "Enter") {
        const item =
          rows.find(({ highlighted }) => highlighted)?.item ??
          (filtered.length === 1 ? filtered[0] : undefined);
        if (item === undefined) return;
        event.preventDefault();
        select(item);
      }
    },
    [filtered, rows, select],
  );

  const onChange = useCallback(
    (value: string) => {
      setQuery(value);
      setIsDismissed(false);
    },
    [setQuery],
  );

  // the keyboard way back to the text from a focused row
  const onCardKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Escape") return;
    setIsDismissed(true);
    input.current?.focus();
  };

  const isOpen = isFocused && !isDismissed;
  return (
    <div className={className} ref={focusRef("root")}>
      <Input
        inputRef={inputRef}
        value={query}
        onChange={onChange}
        onKeyDown={onKeyDown}
        label={label}
        placeholder={placeholder}
      />
      <svg
        className="chevron"
        data-open={isOpen}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
      {/* the card leaves the DOM once its fade is over, so the group's rows go with it */}
      <Card isOpen={isOpen} onKeyDown={onCardKeyDown}>
        {isOpen &&
          (isLoading ? (
            <Loading.Small />
          ) : filtered.length === 0 ? (
            emptyState
          ) : (
            rows.map(({ item, subscription, selected, tabIndex, highlighted }, index) => (
              <ItemRenderer
                key={index}
                item={item}
                isSelected={selected}
                isHighlighted={highlighted}
                tabIndex={tabIndex}
                subscription={subscription}
                query={query}
                select={select}
                itemToLabel={itemToLabel}
              />
            ))
          ))}
      </Card>
    </div>
  );
};

const DropdownField = styled(DropdownFieldInternals)`
  position: relative;
  anchor-scope: --dropdown-anchor;

  & > ${Input} {
    anchor-name: --dropdown-anchor;

    input {
      padding-right: 44px;
    }
  }

  // the chevron at the text's end, turned over while the card is up
  & > .chevron {
    position: absolute;
    right: 14px;
    top: 50%;
    translate: 0 -50%;
    width: 20px;
    height: 20px;
    color: var(--neutral-500);
    pointer-events: none;
    transition:
      rotate 200ms,
      color 200ms;

    &[data-open="true"] {
      rotate: 180deg;
      color: var(--neutral-800);
    }
  }
` as typeof DropdownFieldInternals;

export default DropdownField;
