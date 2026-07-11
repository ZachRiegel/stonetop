import styled from "@emotion/styled";
import {
  defineQuery,
  type QueryResult,
  useClient,
  useCurrentUser,
  useObserveQuery,
} from "amplify.ts";
import DropdownField from "components/DropdownField.tsx";
import Font from "components/Font.tsx";
import Loading from "components/Loading.tsx";
import useMinimumLoading from "hooks/useMinimumLoading.ts";
import _ from "lodash";
import footer from "pages/campaigns/footer.png";
import misc from "pages/campaigns/misc.png";
import PlayerOption from "pages/players/PlayerOption.tsx";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useParams } from "react-router";
import discordProfilePictureForUser from "utils/discordProfilePictureForUser.ts";

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;

  display: grid;
  grid-template-rows: 1fr max-content 1fr;
  justify-content: center;
`;

const Footer = styled.img`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -32px;
  width: 100vw;
  object-fit: cover;
  object-position: top;
  aspect-ratio: 2301 / 844;
  mix-blend-mode: screen;
  max-height: 600px;
  opacity: 0.7;
`;

const Card = styled.div`
  grid-row: 2;
  display: flex;
  flex-direction: column;
  width: min(360px, calc(100vw - 32px));
  border-radius: 16px;
  background-color: var(--neutral-75);
  overflow: hidden;
  box-shadow: 8px 8px 12px 12px rgba(0 0 0 / 0.3);
  isolation: isolate;
`;

const CardHeader = styled.div`
  padding: 12px 20px;
`;

const ScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 340px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 8px scrollbar gutter (styled globally in RootLayout) + 12px right
     padding = 20px, matching CardHeader */
  padding: 12px 12px 12px 20px;
  scrollbar-gutter: stable;
  border-top: 2px solid var(--neutral-100);
`;

const EmptyState = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;

  img {
    height: 232px;
    aspect-ratio: 648 / 828;
    mix-blend-mode: screen;
  }
`;

const CardBottom = styled.div`
  display: grid;
  padding: 16px 20px;
  border-top: 2px solid var(--neutral-100);
`;

const PlayerLabel = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-auto-rows: max-content;
  column-gap: 12px;
  row-gap: 2px;
  align-items: center;
  padding: 12px 12px 12px 16px;
  border-radius: 16px;
  background-color: var(--neutral-25);
  box-shadow: var(--shadow-medium);
`;

const Avatar = styled.img`
  grid-row: span 2;
  width: 30px;
  height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

// UserProfile can't be list-filtered by campaign (filters only cover a model's
// own fields), so query the CampaignMember join rows and pluck the profiles.
const playersQuery = (campaignId: string | undefined) =>
  defineQuery(
    "CampaignMember",
    ["id", "campaign.owner", "userProfile.*", "userProfile.characters.*"],
    { campaignId: { eq: campaignId } },
  );
type Player = NonNullable<QueryResult<ReturnType<typeof playersQuery>>["userProfile"]>;

// AppSync returns custom-type arrays as (T | null)[], hence the unwrapping
type SearchProfile = NonNullable<
  NonNullable<
    Awaited<ReturnType<ReturnType<typeof useClient>["queries"]["searchPlayers"]>>["data"]
  >[number]
>;

// module-level so their identities are stable across renders (DropdownField memoizes on them)
const profileName = (profile: SearchProfile) =>
  profile.displayName ?? profile.name ?? "Unknown user";

// the server matches on either field, so the dropdown's own filter must too
const profileMatches = (profile: SearchProfile, query: string) =>
  [profile.displayName, profile.name].some((value) => value?.toLowerCase().includes(query));

const Players = () => {
  const { campaignId } = useParams();
  const members = useObserveQuery(useMemo(() => playersQuery(campaignId), [campaignId]));
  const user = useCurrentUser();
  const client = useClient();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [query, _setQuery] = useState("");
  const [isSearching, startSearch] = useTransition();
  const requestIdRef = useRef(0);

  const setQuery = useCallback(
    (query: string) => {
      _setQuery(query);
      const requestId = ++requestIdRef.current; // supersedes any in-flight search
      if (query.trim() === "" || !campaignId) {
        setSearchResults([]);
        return;
      }
      startSearch(async () => {
        // debounce: newer keystrokes bump the counter, so stale runs bail after the wait
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (requestId !== requestIdRef.current) return;
        const { data } = await client.queries.searchPlayers({ campaignId, search: query.trim() });
        if (requestId !== requestIdRef.current) return;
        // state set after await must be re-wrapped to stay part of the transition
        startSearch(() => setSearchResults(_.compact(data ?? [])));
      });
    },
    [client, campaignId],
  );

  const players = useMemo(
    () =>
      _.chain(members)
        .map((member) => member.userProfile)
        .compact() // members without a UserProfile yet resolve to null
        .uniqBy((profile) => profile.id)
        .value(),
    [members],
  );

  const characterLine = useCallback(
    (player: Player) =>
      // UserProfile ids are Cognito usernames, matching Campaign.owner
      player.id === members?.[0]?.campaign?.owner
        ? "Game Master"
        : (player.characters.find((character) => character.campaignId === campaignId)?.name ??
          "No character yet"),
    [members, campaignId],
  );

  const isLoading = useMinimumLoading(!members);

  const playerEntries = useMemo(
    () =>
      players.map((player) => (
        <PlayerLabel key={player.id}>
          <Avatar
            src={discordProfilePictureForUser(player)}
            alt={player.displayName ?? player.name ?? "Unknown user"}
          />
          <Font.Bold20 text={player.displayName ?? player.name ?? "Unknown user"} />
          <Font.Italic16 element="div" text={characterLine(player)} />
        </PlayerLabel>
      )),
    [players, characterLine],
  );

  return (
    <Page>
      <Footer src={footer} />
      <Card>
        <CardHeader>
          <Font.Bold32 element="h1" text="Players" />
        </CardHeader>
        <ScrollArea>
          {isLoading || !members ? (
            <Loading.Medium />
          ) : players.length === 0 ? (
            <EmptyState>
              <img src={misc} alt="" />
              <Font.Italic16 element="div" text="No players yet." />
            </EmptyState>
          ) : (
            playerEntries
          )}
        </ScrollArea>
        {user && user.username === members?.[0]?.campaign?.owner && (
          <CardBottom>
            <DropdownField
              items={searchResults}
              selectedItem={selectedProfileId}
              setSelectedItem={setSelectedProfileId}
              query={query}
              setQuery={setQuery}
              itemToValue={(profile) => profile.id}
              itemToLabel={profileName}
              isLoading={isSearching}
              emptyState={
                <Font.Italic16
                  element="div"
                  text={
                    query.trim() === "" ? "Type a name to search." : "No matching players found."
                  }
                />
              }
            />
          </CardBottom>
        )}
      </Card>
    </Page>
  );
};

export default Players;
