import styled from "@emotion/styled";
import DefaultItemRenderer from "components/internals/DefaultItemRenderer.tsx";
import useFocusWithin from "hooks/useFocusWithin.ts";
import useNonNullable from "hooks/useNonNullable.ts";
import * as React from "react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import Input from "./Input.tsx";
import Loading from "./Loading.tsx";

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
  ItemRenderer?: typeof DefaultItemRenderer<T, U>;
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
  const { focusProps, isFocused } = useFocusWithin();
  useEffect(() => {
    if (!isFocused) setIsDismissed(false);
  }, [isFocused]);

  const _matchingItem = useMemo(
    () => items.find((item) => itemToValue(item) === selectedItem),
    [itemToValue, items, selectedItem],
  );
  const matchingItem = useNonNullable(_matchingItem);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        itemToLabel(item).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [itemToLabel, items, query],
  );

  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  useEffect(() => setHighlightedIndex(null), [query, filtered]);

  useEffect(() => {
    setQuery(matchingItem === undefined ? "" : (itemToLabel?.(matchingItem) ?? matchingItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  const select = useCallback(
    (item: T) => {
      setHighlightedIndex(null);
      setIsDismissed(true);
      setSelectedItem(itemToValue(item));
    },
    [itemToValue, setSelectedItem],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setIsDismissed(false);
        if (filtered.length === 0) return;
        setHighlightedIndex(
          event.key === "ArrowDown"
            ? ((highlightedIndex ?? -1) + 1) % filtered.length
            : ((highlightedIndex ?? filtered.length) - 1 + filtered.length) % filtered.length,
        );
      } else if (event.key === "Enter") {
        const item =
          highlightedIndex !== null
            ? filtered[highlightedIndex]
            : filtered.length === 1
              ? filtered[0]
              : undefined;
        if (item === undefined) return;
        event.preventDefault();
        select(item);
      }
    },
    [filtered, highlightedIndex, select],
  );

  const onChange = useCallback(
    (value: string) => {
      setQuery(value);
      setHighlightedIndex(null);
      setIsDismissed(false);
    },
    [setQuery],
  );

  return (
    <div className={className} {...focusProps}>
      <Input
        value={query}
        onChange={onChange}
        onKeyDown={onKeyDown}
        label={label}
        placeholder={placeholder}
      />
      {isFocused && !isDismissed && (
        <div className="card">
          {isLoading ? (
            <Loading.Small />
          ) : filtered.length === 0 ? (
            emptyState
          ) : (
            filtered.map((item, index) => (
              <ItemRenderer
                key={index}
                item={item}
                isHighlighted={index === highlightedIndex}
                selectedItem={selectedItem}
                query={query}
                select={select}
                itemToLabel={itemToLabel}
                itemToValue={itemToValue}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const DropdownField = styled(DropdownFieldInternals)`
  anchor-scope: --dropdown-anchor;

  & > ${Input} {
    anchor-name: --dropdown-anchor;
  }

  & > .card {
    position: fixed;
    position-anchor: --dropdown-anchor;
    position-area: bottom;
    position-try-fallbacks: flip-block;
    width: anchor-size(width);
    margin-top: 4px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 1;

    display: grid;
    padding: 8px;
    border-radius: 12px;
    background-color: var(--neutral-100);
    box-shadow: var(--shadow-medium);
  }
` as typeof DropdownFieldInternals;

export default DropdownField;
