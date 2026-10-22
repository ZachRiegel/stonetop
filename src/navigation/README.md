# Navigation

A strip across the top of every signed-in page, in place of the sidebar the app had until
2026-10-19 (the user: the sidebar "reads corporate"; the pattern comes from a game menu, and
was drafted as "Poster wall" in `src/holding/pageMocks.html`, five directions tried). A layout
under `AuthenticatedLayout` (`CampaignNavigationLayout.tsx`, `LoggedInUserNavigationLayout.tsx`)
describes its navigation as data, a `Navigation` (`NavigationContext.tsx`): the campaign it is
in, if any, by name, and its sections as tabs (`components/TabRow.tsx`'s `Tab`: a path, a
label, a glyph and the paper of its pill; the router marks the open one, each tab being a
`NavLink` matched exactly). The layout hands that
to `hooks/useNavigation.ts`, which keeps it in `AuthenticatedLayout`'s state while the layout
is mounted, and `AuthenticatedLayout` draws `Strip.tsx` from it, full size from 1024px and
compact below (`hooks/useResponsiveSize.ts`).

Section paths are absolute. The links are rendered by `AuthenticatedLayout`, above the
layout that describes them, so a relative path would resolve against the wrong route.

## The strip: `Strip.tsx`

From the left: the standing stone in grey, which is the way home from anywhere (final, user
2026-10-19; a chevron, a "Campaigns" crumb, two tiers, a closable chip, a card on the overview,
the name as a switcher menu and a strip-end link were drafted and dropped); inside a campaign,
"Campaign" small over the campaign's name in the title face, ruled off from what follows; the
tabs; and the account at the end (`AccountMenu.tsx`: picture and name in a dark pill, which
opens the sign-out menu beneath it). No version string, no key hints.

Compact (a phone or a tablet), the header is the stone, the app's or the campaign's name and
the account's picture alone, and the tabs are a second row of glyph cells in which only the
open tab spreads into its pill with its name, so the row fits a phone (text and wrapping rows
were tried first).

## The tabs: `components/TabRow.tsx`

Grey caps in the title face; the open one a rounded pill with a soft shadow (a tilted cream
stamp with a hard shadow, and a random tilt, came before). At the top level the pill takes the
paper of that section's poster on the home wall (Campaigns blue, Rules orange, About purple),
and inside a campaign the paper of its poster on the overview (Table blue, Character purple,
Players green, Rules orange); Home and Overview stay cream. The papers are `PAPERS` in
`components/Poster.tsx`.

## The levels

- **Home, Campaigns, Rules, About** at the top. Home (`pages/home/Home.tsx`) is a wall of the
  other three as posters (`components/PosterWall.tsx`), Campaigns the main one. Campaigns
  (`pages/campaigns/Campaigns.tsx`) is one row of campaign cards on the posters' papers, each
  campaign's paper and woodcut picked from its id (user, 2026-10-21; a slate paper, colour
  being kept for the home wall, came first and was lost in the landscape). The cards are 17
  wide to 28 tall, 340 by 560 at 1280 wide and growing with the screen, 237 by 390 on a phone
  (the sizes were settled over 2026-10-21: 250 by 500 at every size was too small on a
  desktop, cards sized from the row too big); they start from the left gutter on a desktop
  and snap card to card, centred, below that. The landscape is screened faintly over the
  whole page (a pool of black behind the row, from "Spotlight", one of six drafts in
  `src/holding/campaignSelector.html`, was tried and dropped), and a cream "+ New campaign"
  pill sits at the page's bottom right (a New-campaign card was tried and dropped). Rules and
  About have no pages yet.
- **Overview, Table, Character, Players, Rules** inside a campaign. The overview
  (`pages/campaign/Overview.tsx`) is a wall of three of them, the table the main one unless
  the campaign needs something first. The
  table has no page yet (user: empty, not a copy of the dice page). The dice page stands in
  for the character sheet, and lost its title: the pill says where you are. Players
  (`pages/players/Players.tsx`, user 2026-10-21) is a roster on the ground, no paper and no
  title: two small-caps heads, Game Master and Players with their count, over the members
  as soft cells a shade up from the ground, each the face ringed in black beside the name in
  the title face and the part they play in italics, nothing marking the caller (the account
  in the strip already does); the tree, the page's own mark, screened at the right; and the
  Game Master's invite as a cream "Copy invite link" pill at the bottom right with a grey
  "Regenerate" beside it (`components/Pill.tsx`, the Campaigns page's pill shared). Seven
  takes on the roster are in `src/holding/playersDrafts.html`, "grouped cells" the one kept
  (the five directions before it, sheets, roster, wall, seats and ledger, narrowed to the
  roster first); a 360px card with a title, a 340px scroll of rows and two grey buttons was
  the page before, from the sidebar's day. Rules (user, 2026-10-21) has no page yet, like
  the top-level one; its glyph is the book, Character having the playbooks.

## The posters: `components/Poster.tsx`

A screenprint: a flat paper in one of the palette's hues (relative colour syntax, so the hue
is the palette's own) with the woodcut masked into it in the same hue's darker ink, the title
along the foot with a capital first letter, a caption, and the people on it. The third paper
is a purple from the magenta's hue and the fourth a green for the players (user, 2026-10-20; a
gold from the cream's hue was drafted in `src/holding/pageMocks.html` and dropped, and a slate
for the campaign cards was lost in the landscape however it was rimmed, `campaignCards.html`
and `campaignSelector.html`). A poster a wall promotes past its usual order (`suggested`) has
its rim lit in cream with a soft light bleeding in from it (user, 2026-10-21; nine animations
and four colourings drafted in `src/holding/posterAttention.html` and `posterRims.html`: a
drop-shadow glow breathing outside the sheet, a spark running round the rim, the palette's
opposites on every paper); the usual lead is never lit. A campaign has no picture or colour
of its own yet, so `pages/campaigns/card.ts` picks one of three woodcuts and one of the four
papers by its id.
