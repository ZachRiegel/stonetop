import styled from "@emotion/styled";
import Pill from "components/Pill.tsx";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useTransition } from "react";

// the two pills side by side, the cream one at the end; the page places them
const Pills = styled.div`
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  column-gap: 4px;
`;

// The Game Master's invite, as pills for the page's bottom right (components/Pill.tsx): the
// cream one copies the link, the grey one beside it rotates it. Rendered by the Players page
// for the Game Master, who is the only member the server hands the token to.
const InvitePlayers = ({
  campaignId,
  inviteToken,
  className,
}: {
  campaignId: Id<"campaigns">;
  inviteToken: string;
  className?: string;
}) => {
  const regenerate = useMutation(api.campaigns.regenerateInvite);
  const [copied, startCopy] = useTransition();
  const [regenerating, startRegenerate] = useTransition();

  // "Copied!" for two seconds after the link lands on the clipboard
  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?inviteLinkId=${inviteToken}`);
    startCopy(() => new Promise((resolve) => setTimeout(resolve, 2000)));
  }, [inviteToken]);
  // the grey pill is held while the token rotates (the transition wants a promise of nothing)
  const regenerateLink = useCallback(
    () => startRegenerate(() => regenerate({ campaignId }).then(() => undefined)),
    [regenerate, campaignId],
  );

  return (
    <Pills className={className}>
      <Pill.Grey onClick={regenerateLink} disabled={regenerating}>
        Regenerate
      </Pill.Grey>
      <Pill.Cream onClick={copyLink}>{copied ? "Copied!" : "Copy invite link"}</Pill.Cream>
    </Pills>
  );
};

export default InvitePlayers;
