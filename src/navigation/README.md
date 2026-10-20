# Navigation

The app's navigation is drawn two ways from one description. A layout under
`AuthenticatedLayout` (`CampaignNavigationLayout.tsx`, `LoggedInUserNavigationLayout.tsx`)
describes its navigation as data, a `Navigation` (`NavigationContext.tsx`): the campaign it is
in, if any, with its name and the way back to the campaign list, and its sections, each a
path, a label, a glyph and whether it is the open one. The layout hands that to
`hooks/useNavigation.ts`, which keeps it in `AuthenticatedLayout`'s state while the layout is
mounted. `AuthenticatedLayout` then renders either the sidebar or the row and panel from it,
by `hooks/useResponsiveSize.ts`: the sidebar from 1024px, the row and panel below.

Section paths are absolute. The links are rendered by `AuthenticatedLayout`, above the
layout that describes them, so a relative path would resolve against the wrong route.

## Desktop: `Sidebar.tsx`

The phone panel's layout and shades folded to a 66px rail of icons that opens to 320px
under the pointer (after 750ms) or focus. Open, it is the panel: its top (`PanelTop.tsx`),
a rule, the sections as rows with the open one a shade up, and the account at the foot.
Folded, the rows show their icons only, and the top its mark only (the campaign's knotwork
inside a campaign, the standing stone outside one), which stays put as the rail folds while
the words beside it fade; the rule under it spans the whole rail when folded and the rows'
width when open. Folded, the top is a 66px square (13px, the 40px mark, 13px, the rule),
the rail's own width; the words beside the mark are set to the same 40px, with 14px and
24px lines and 2px between, so the top never changes height and the rail moves in one
direction only as it folds (user: no animating two ways at once; the mark's cell should
always be square). The rows are `components/NavigationItem.tsx`, which depend on the rail's
container query to show their labels and the open section's shade. Before 2026-10-19 the
sidebar had the app's textured background and a knotwork card for the campaign; the user
asked for it to match the panel, colours included.

## Phone and tablet: `MobileNavigation.tsx`

A 48px row across the top of the page with a menu button and the campaign's name ("Stonetop"
outside a campaign), and a full-height side panel the button slides in over the row from the
left. Inside a campaign the panel's top is a small line with "Campaign" at the left and the
way home at the right (the standing stone and "Home"), and the campaign's name in bold
beneath; on the base pages it is the standing stone and "Stonetop". Then a rule, the sections
as flat rows with the open one a shade up, and at the foot the account as the sidebar has
it: picture, name and the cog that opens the sign-out menu. The top has 12px more above it
and before its rule than the sidebar gives it, since the panel starts at the screen's very
top and read cramped without (user). It has no close
of its own: a tap off it (the scrim), Escape or picking a section closes it, and so does
any change of route.

Opening is a 320ms slide for the panel on a long-tailed ease (`cubic-bezier(0.22, 1, 0.36,
1)`), and its rows come in from the left one after another, 70ms apart, as the slide tails
off; the account at the foot takes the sixth place in that order whatever the count of
sections, so it lands a beat after them (user, 2026-10-19). On close the rows fade together
as the panel slides out in 220ms. A quicker, plainer
version (150ms slide, 200ms rows 90ms apart, ease-out) was too fast and jerky (user,
2026-10-19). The panel and scrim stay `visibility: visible` until the close's transition is
over (a delayed `visibility` transition), so they have something to animate.

### Decisions (2026-10-19, drafted in `src/holding/responsiveHeader.html`)

- A row header rather than a narrower rail: on a phone the rail took too much width.
- A side panel over a dropdown sheet, a floating card and an unfolding band of pills, tabs,
  segments or tiles, all drawn and set aside; iOS Safari's floating glass bar at the foot of
  the screen does lie over the panel's foot, accepted.
- The panel covers the row entirely rather than hanging under it, with no copy of the row at
  its top (a copy read oddly) and no close button (a tap off it is enough).
- No "My campaigns" row among the sections (it read as a section). The way back went to
  the foot as a caption, then as a row, then (user) the account went back to the foot to
  mirror the desktop and the way back moved up into the campaign's top line, where it also
  says which context you are in: "Campaign" at the left, the way back at the right. Of six
  structures (crumbs, eyebrow and chevron, outline, switcher, banner, crumb in the row), six
  turns on two of them, and twelve wordings and looks for the link, the user chose the
  eyebrow line with the standing stone and "Home": "Home" names the base pages honestly
  (Campaigns, Characters and About all live there, "Campaigns" names only one), and the
  standing stone is the mark the base pages' own top carries. The desktop sidebar now
  shares the top outright.
- The account's avatar, previously at the end of the row, was dropped from the row.
- Neutral shades throughout (row and panel `--neutral-75`, the open section `--neutral-100`,
  hover `--neutral-150`) rather than the desktop's textured background.

## The top: `PanelTop.tsx`

Inside a campaign, the campaign's mark (the knotwork, from the navigation data) and
beside it one small line with "Campaign" in italic grey at the left and the way home at the
right (the standing stone at 18px and "Home", a link), and the campaign's name in bold
beneath, wrapping as it must. On the base pages, the standing stone at 40px and
"Stonetop". Laid out as the sections' rows are (mark, then words), so the sidebar can fold
it the same way.

## The account: `AccountMenu.tsx`

The account and its sign-out menu, a `components/Popover.tsx` anchored to the account's row
(picture, name, cog) with the menu above it: the sidebar's own bottom item, or the same row
in the panel's neutrals (`variant="panel"`).
