import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import NavigationItem from "components/NavigationItem.tsx";
import Popover from "components/Popover.tsx";
import type { Doc } from "convex/_generated/dataModel";
import useModal from "hooks/useModal.ts";
import { authClient } from "lib/auth-client.ts";
import { useCallback } from "react";
import { useNavigate } from "react-router";

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  object-fit: cover;
`;

// the panel's row on a phone or tablet: the sidebar's item in the panel's neutrals, raised
// a shade from the panel
const PanelRow = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  background-color: var(--neutral-100);
  box-shadow: var(--shadow-small);
`;

const MenuCard = styled.div`
  display: grid;
  padding: 8px;
  border-radius: 12px;
  background-color: var(--neutral-100);
  box-shadow: var(--shadow-medium);
`;

// The account and its menu (sign out): the account's picture, name and cog as a row, with
// the menu above it. In the sidebar the row is the sidebar's own item (which needs the
// sidebar's container query); in the phone and tablet panel it is a plain raised row.
const AccountMenu = ({
  user,
  variant = "sidebar",
}: {
  user: Pick<Doc<"users">, "picture" | "displayName">;
  variant?: "sidebar" | "panel";
}) => {
  const navigate = useNavigate();
  const menu = useModal();
  const signOut = useCallback(
    () => authClient.signOut().then(() => navigate("/login", { replace: true })),
    [navigate],
  );
  const Row = variant === "sidebar" ? NavigationItem.Solid : PanelRow;
  return (
    <Popover
      verticalAlignment="top"
      horizontalAlignment="span-left"
      isOpen={menu.isOpen}
      requestClose={menu.close}
      content={
        <MenuCard>
          <Button.MenuItem text="Sign out" onClick={signOut} />
        </MenuCard>
      }
    >
      <Row>
        <Avatar src={user.picture} alt={user.displayName} />
        <Font.Bold16 element="div" text={user.displayName} />
        <Button.Transparent Icon={Icon.Cog} onClick={menu.open} />
      </Row>
    </Popover>
  );
};

export default AccountMenu;
