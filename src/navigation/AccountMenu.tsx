import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Popover from "components/Popover.tsx";
import type { Doc } from "convex/_generated/dataModel";
import useModal from "hooks/useModal.ts";
import { authClient } from "lib/auth-client.ts";
import { useCallback } from "react";
import { useNavigate } from "react-router";

// the account as a pill at the strip's end: picture and name in a dark round with a grey
// rim; compact, the picture alone
const Pill = styled.button<{ compact: boolean }>`
  display: grid;
  grid-template-columns: max-content max-content;
  column-gap: 10px;
  align-items: center;
  padding: ${({ compact }) => (compact ? 0 : "5px 14px 5px 6px")};
  border: ${({ compact }) => (compact ? "none" : "1.5px solid var(--neutral-200)")};
  border-radius: 999px;
  background: ${({ compact }) => (compact ? "transparent" : "rgb(0 0 0 / 0.4)")};
  color: var(--neutral-800);
  cursor: pointer;

  &:hover {
    border-color: var(--neutral-300);
  }
  &:focus-visible {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 999px;
  object-fit: cover;
`;

// a name reads with a capital first letter whatever was typed (user, 2026-10-21); a grid item
// is a block container, so ::first-letter applies to the span
const Name = styled(Font.Semibold14)`
  color: inherit;
  line-height: 1.2;

  &::first-letter {
    text-transform: uppercase;
  }
`;

const MenuCard = styled.div`
  display: grid;
  padding: 8px;
  border-radius: 12px;
  background-color: var(--neutral-100);
  box-shadow: var(--shadow-medium);
`;

// The account and its menu (sign out): a pill with the account's picture and name at the
// strip's end, which opens the menu beneath it. `compact` shows the picture alone, for a
// phone's strip.
const AccountMenu = ({
  user,
  compact = false,
}: {
  user: Pick<Doc<"users">, "picture" | "displayName">;
  compact?: boolean;
}) => {
  const navigate = useNavigate();
  const menu = useModal();
  const signOut = useCallback(
    () => authClient.signOut().then(() => navigate("/login", { replace: true })),
    [navigate],
  );
  return (
    <Popover
      verticalAlignment="bottom"
      horizontalAlignment="span-left"
      width="max(anchor-size(width), 160px)"
      isOpen={menu.isOpen}
      requestClose={menu.close}
      content={
        <MenuCard>
          <Button.MenuItem text="Sign out" onClick={signOut} />
        </MenuCard>
      }
    >
      <Pill compact={compact} aria-label="Account" title={user.displayName} onClick={menu.open}>
        <Avatar src={user.picture} alt="" />
        {!compact && <Name element="span" text={user.displayName} />}
      </Pill>
    </Popover>
  );
};

export default AccountMenu;
