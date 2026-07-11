import { defineQuery, useClient, useObserveQuery } from "amplify.ts";
import Button from "components/Button.tsx";
import { useMemo, useTransition } from "react";
import ButtonRow from "components/ButtonRow.tsx";

const inviteQuery = (campaignId: string) =>
  defineQuery("InviteLink", ["id"], { campaignId: { eq: campaignId } });

const InvitePlayers = ({ campaignId }: { campaignId: string }) => {
  const client = useClient();
  const links = useObserveQuery(useMemo(() => inviteQuery(campaignId), [campaignId]));
  const [copied, startCopy] = useTransition();

  const copyLink = async () => {
    // campaigns predating invite links have no row yet; the regenerate
    // mutation creates one (all InviteLink writes happen in lambdas)
    const id = links?.[0]?.id ?? (await client.mutations.regenerateInviteLink({ campaignId })).data;
    if (!id) throw new Error("Could not create invite link");
    await navigator.clipboard.writeText(`${window.location.origin}/?inviteLinkId=${id}`);
    startCopy(async () => {
      await new Promise((res) => window.setTimeout(res, 2000));
    });
  };

  const regenerate = async () => {
    await client.mutations.regenerateInviteLink({ campaignId });
  };

  // rendering before the query resolves would let copyLink rotate a live
  // link it just hasn't seen yet, killing URLs already in circulation
  if (!links) return null;

  return (
    <ButtonRow>
      <Button.Primary text={copied ? "Copied!" : "Copy invite link"} onClick={copyLink} />
      <Button.Secondary text="Regenerate" onClick={regenerate} />
    </ButtonRow>
  );
};

export default InvitePlayers;
