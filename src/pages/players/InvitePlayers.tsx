import Button from "components/Button.tsx";
import ButtonRow from "components/ButtonRow.tsx";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useTransition } from "react";

// Rendered by the Players page for the Game Master, who is the only member
// the server hands the token to
const InvitePlayers = ({
  campaignId,
  inviteToken,
}: {
  campaignId: Id<"campaigns">;
  inviteToken: string;
}) => {
  const regenerate = useMutation(api.campaigns.regenerateInvite);
  const [copied, startCopy] = useTransition();

  // "Copied!" for two seconds after the link lands on the clipboard
  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?inviteLinkId=${inviteToken}`);
    startCopy(() => new Promise((resolve) => setTimeout(resolve, 2000)));
  }, [inviteToken]);
  const regenerateLink = useCallback(() => regenerate({ campaignId }), [regenerate, campaignId]);

  return (
    <ButtonRow>
      <Button.Primary text={copied ? "Copied!" : "Copy invite link"} onClick={copyLink} />
      <Button.Secondary text="Regenerate" onClick={regenerateLink} />
    </ButtonRow>
  );
};

export default InvitePlayers;
