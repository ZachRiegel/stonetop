import Poster from "components/Poster.tsx";
import PosterWall from "components/PosterWall.tsx";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import playbooksPng from "icons/playbooks.png";
import standingStonePng from "icons/standingStone.png";
import { artOf, count, facesOf, othersOf, roleOf } from "pages/campaigns/card.ts";
import landscape from "pages/campaigns/footer.png";
import stones from "pages/landing/footer.png";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

// The home wall: the three sections the strip lists, as posters. Campaigns is the main one
// and shows the campaign joined last; Rules and About have no pages yet.
const Home = () => {
  const campaigns = useQuery(api.campaigns.list);
  const me = useQuery(api.users.me);
  const join = useMutation(api.campaigns.join);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joined = useRef(false);

  // Use a pending invite once, on mount. The token arrives in the URL, or in sessionStorage
  // when the sign-in redirect dropped it from the URL; both land here, on "/".
  useEffect(() => {
    const inviteToken = searchParams.get("inviteLinkId") ?? sessionStorage.getItem("inviteLinkId");
    sessionStorage.removeItem("inviteLinkId");
    if (!inviteToken || joined.current) return;
    joined.current = true;
    join({ inviteToken }).then(
      (campaignId) => navigate(`/campaign/${campaignId}`, { replace: true }),
      () => navigate("/campaigns?invite=invalid", { replace: true }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount; re-running on later renders would join/navigate again
  }, []);

  const latest = campaigns?.at(-1);
  return (
    <PosterWall hero={stones}>
      <Poster
        to="/campaigns"
        paper="blue"
        art={latest ? artOf(latest._id) : landscape}
        eyebrow={campaigns && count(campaigns.length, "campaign")}
        title="Campaigns"
        caption={latest ? `${latest.name} · ${roleOf(latest)}` : "Join one, or start your own"}
        people={latest && facesOf(othersOf(latest, me))}
      />
      <Poster
        to="/rules"
        paper="orange"
        art={playbooksPng}
        fit="icon"
        title="Rules"
        caption="Playbooks, moves and the village"
      />
      <Poster
        to="/about"
        paper="purple"
        art={standingStonePng}
        fit="icon"
        title="About"
        caption="Stonetop, the game and this app"
      />
    </PosterWall>
  );
};

export default Home;
