import Button from "components/Button.tsx";
import ButtonRow from "components/ButtonRow.tsx";
import { useMutation } from "convex/react";
import { useTransition } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?inviteLinkId=${inviteToken}`);
    startCopy(async () => {
      await new Promise((res) => window.setTimeout(res, 2000));
    });
  };

  return (
    <ButtonRow>
      <Button.Primary text={copied ? "Copied!" : "Copy invite link"} onClick={copyLink} />
      <Button.Secondary text="Regenerate" onClick={() => regenerate({ campaignId })} />
    </ButtonRow>
  );
};

export default InvitePlayers;
