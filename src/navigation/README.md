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
Players orange); Home and Overview stay cream. The papers are `PAPERS` in
`components/Poster.tsx`.

## The levels

- **Home, Campaigns, Rules, About** at the top. Home (`pages/home/Home.tsx`) is a wall of the
  other three as posters (`components/PosterWall.tsx`), Campaigns the main one. Campaigns
  (`pages/campaigns/Campaigns.tsx`) is one row of campaign cards on the slate paper, colour
  being kept for the home wall: wide, short cards from the left gutter on a desktop, a row
  that snaps card to card on a phone, the landscape screened over the whole page behind them,
  and a cream "+ New campaign" pill at the page's bottom right (a New-campaign card was tried
  and dropped). Rules and About have no pages yet.
- **Overview, Table, Character, Players** inside a campaign. The overview
  (`pages/campaign/Overview.tsx`) is a wall of the other three, the table the main one. The
  table has no page yet (user: empty, not a copy of the dice page). The dice page stands in
  for the character sheet, and lost its title: the pill says where you are. Players is as it
  was.

## The posters: `components/Poster.tsx`

A screenprint: a flat paper in one of the palette's hues (relative colour syntax, so the hue
is the palette's own) with the woodcut masked into it in the same hue's darker ink, the title
in caps along the foot, a caption, and the people on it. The third paper is a purple from the
magenta's hue; a gold from the cream's hue and a green were drafted, choice pending. A campaign
has no picture of its own yet, so `pages/campaigns/card.ts` picks one of three woodcuts by its
id.
