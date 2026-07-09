import styled from "@emotion/styled";
import useFocusWithin from "hooks/useFocusWithin.ts";
import * as React from "react";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Input from "./Input.tsx";
import Loading from "./Loading.tsx";

// Keeps focus on the input through a click on an item; letting mousedown blur it
// would unmount the card before the click lands.
const preventFocusSteal = (event: React.MouseEvent) => event.preventDefault();

const DropdownFieldInternals = <T,>({
  items,
  selectedItem,
  itemToString,
  ItemRenderer,
  onSelect,
  onQueryChange,
  isLoading,
  emptyState,
  label,
  placeholder,
  className,
}: {
  items: T[];
  selectedItem: T | null;
  itemToString: (item: T) => string;
  ItemRenderer: ComponentType<{ item: T; isHighlighted: boolean }>;
  onSelect: (item: T) => void;
  // Fires only on user input — not on selection or selectedItem syncs — so
  // parents can drive a server-backed search without redundant fetches.
  onQueryChange?: (query: string) => void;
  isLoading: boolean;
  emptyState: ReactNode;
  label?: string;
  placeholder?: string;
  className?: string;
}) => {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  // Hide the card after a selection until the user types/arrows/refocuses.
  const [isDismissed, setIsDismissed] = useState(false);
  const { focusProps, isFocused } = useFocusWithin();

  const filtered = useMemo(
    () =>
      items.filter((item) => itemToString(item).toLowerCase().includes(query.trim().toLowerCase())),
    [items, itemToString, query],
  );
  // Derived rather than synced: an index stranded past the end of a shrunken filter is no highlight.
  const highlighted =
    highlightedIndex !== null && highlightedIndex < filtered.length ? highlightedIndex : null;

  useEffect(() => {
    if (!isFocused) setIsDismissed(false);
  }, [isFocused]);

  useEffect(() => {
    setQuery(selectedItem === null ? "" : itemToString(selectedItem));
    // itemToString omitted: only the selection changing should overwrite what the user typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  const select = useCallback(
    (item: T) => {
      // Fill the field optimistically; the selectedItem effect re-syncs once the parent commits.
      setQuery(itemToString(item));
      setHighlightedIndex(null);
      setIsDismissed(true);
      onSelect(item);
    },
    [itemToString, onSelect],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setIsDismissed(false);
        if (filtered.length === 0) return;
        setHighlightedIndex(
          event.key === "ArrowDown"
            ? ((highlighted ?? -1) + 1) % filtered.length
            : ((highlighted ?? filtered.length) - 1 + filtered.length) % filtered.length,
        );
      } else if (event.key === "Enter") {
        const item =
          highlighted !== null
            ? filtered[highlighted]
            : filtered.length === 1
              ? filtered[0]
              : undefined;
        if (item === undefined) return;
        event.preventDefault();
        select(item);
      }
    },
    [filtered, highlighted, select],
  );

  const onChange = useCallback(
    (value: string) => {
      setQuery(value);
      setHighlightedIndex(null);
      setIsDismissed(false);
      onQueryChange?.(value);
    },
    [onQueryChange],
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
              // index keys: itemToString values may collide, and rows hold no state
              <button
                key={index}
                type="button"
                onMouseDown={preventFocusSteal}
                onClick={() => select(item)}
              >
                <ItemRenderer item={item} isHighlighted={index === highlighted} />
              </button>
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

    & > button {
      display: block;
      width: 100%;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
  }
` as typeof DropdownFieldInternals;

export default DropdownField;
