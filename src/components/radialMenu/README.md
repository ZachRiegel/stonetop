# Radial menu

A declarative radial menu round a centre button: rings at set distances from it, arcs of
buttons placed on them by angle, with the popover, hover, keyboard, press-and-drag gesture and a
glass bubble that follows the drag all built in. `RadialMenu.tsx` is the React component and
styling, `Glass.tsx` the bubble, `geometry.ts` the pure layout, path and hit-testing maths,
pinned by `geometry.test.ts`. `Centre.tsx`, `Ring.tsx`, `Arc.tsx`, `Segment.tsx` and
`Spacer.tsx` are description-only elements that render nothing; `RadialMenu` reads their
props and draws everything itself, so the layout, the hit-testing and the bubble all come
from one resolved structure. The dice page's roll menu (`pages/dice/rollMenu/`) is the
consumer.

## Describing a menu

```tsx
<RadialMenu isOpen={…} requestOpen={…} requestClose={…} onDragCentre={…}>
  <Centre diameter={48}>
    <Button.Cream Icon={Icon.Die} aria-label="Roll dice" />
  </Centre>
  <Ring startDistance={36} endDistance={76}>
    <Arc angle={135}>
      <Segment span={45} label="blue dice" fill="…" hoverFill="…" dimmed={…}
               onActivate={…} onDragEnter={…}>{svg content}</Segment>
      …
    </Arc>
    <Arc angle={0}><Segment span={70} …/></Arc>
  </Ring>
  <Ring startDistance={88} endDistance={128}>
    {chosen && <Arc angle={angleOf(chosen)} dimOthersUnderDrag>…</Arc>}
  </Ring>
</RadialMenu>
```

- **The centre** is one `Centre` among the children, holding a round, labelled button that
  fills a `diameter` px cell; the menu tells it it has a popup (`aria-haspopup`,
  `aria-expanded`) and leaves it closed while it is disabled. The cell is what the popover
  anchors to, where the press that opens the menu starts, and what the pointer is measured
  from.
- **Rings** are bands from `startDistance` to `endDistance` px out from the centre, each
  placed by its own edges: their order among the children means nothing, and the space
  between the centre item and the innermost ring, or between rings, is whatever the
  distances leave. Declare rings unconditionally and make their _arcs_ conditional, so the
  drawing's extent and the pointer board never change size while the menu is open.
- **Arcs** are a run of `Segment`s and `Spacer`s laid out clockwise and centred on `angle`
  (degrees, 0 to the right and 90 up). Segments beside one another share a square edge; a
  run's ends, and the segments either side of a `Spacer`, are rounded by `corner` (6px by
  default). There is no gap prop: a gap on a ring is a `Spacer`, or two arcs.
- **Segments** take an angular `span`, an accessible `label`, a `fill` and `hoverFill`, an
  `outlined` flag (on by default), a `dimmed` flag, and SVG `children` drawn at the segment's
  centre and kept upright as the arc turns. `onActivate` fires on a click, on a drag released
  on it, and on Enter or Space while it is focused; `onDragEnter` when the drag's bubble
  arrives on it.
- Only one `Centre` and `Ring`s may appear in the menu, `Arc`s in a ring and `Segment`s and
  `Spacer`s in an arc, as elements, arrays of them and `null`/`false`; anything else, or a
  second `Centre`, throws. Fragments are not looked into
  (`Children.toArray` does not open them). An arc keeps its identity by its position among
  its siblings, as React children do, so a conditional arc needs no key.
- Open state is the consumer's: `isOpen`, `requestOpen` (the centre button was pressed;
  left out, the button is the consumer's own and a press neither opens nor drags) and
  `requestClose` (Escape, a click outside, a click on the inert centre button, or a press
  released on nothing or on the centre button). Each segment's `onActivate` decides whether
  to close. `onDragCentre` is a drag coming back inside the innermost ring.

## Interaction model

Two ways to use it, sharing one hit-test:

- **Click mode.** Click the centre button to open the menu. Hovering lifts a segment's fill
  to `hoverFill` and sets the pointer cursor. Clicking a segment activates it. Escape, a click
  outside, and a click on the now-inert centre button ask to close; those come from the
  `Popover` (`components/Popover.tsx`), which holds the open menu in a modal `<dialog>` and
  returns focus.
- **Drag mode.** Press on the centre button and drag. A glass bubble follows the pointer,
  snapping onto whatever segment it passes, and each segment it arrives on hears
  `onDragEnter`; coming back inside the innermost ring (onto the button or into the gap
  round it) fires `onDragCentre`. Releasing on a segment activates it; on nothing, or on the
  button, asks to close. A press that never leaves the button is a click and leaves the menu
  open.

The pointer is always read through `held`, which keeps it within the menu's reach. Pulled
past the outer ring, the bubble sits on the ring, and the segment it sits on is what the
drag means.

Pointer events are handled on one board element; the drawing takes no events of its own. A
press registers `pointermove`/`pointerup` listeners on `window` immediately (an
effect-registered listener missed fast clicks), because the dialog that opens mid-press makes
the centre button inert while captured events still bubble to the window. The listeners read
the latest description and callbacks through a ref, so an arc that appears mid-drag (a
count arc after a colour is chosen) is hit-tested on the next move.

## Geometry (`geometry.ts`)

`layoutOf` turns a `MenuSpec` (the description, read from the elements) into a `Layout`:
ring radii, every segment's sector, the menu's `extent` and the held pointer's `reach`.
Angles are degrees, 0 to the right and 90 up; screen y is flipped in `point`.

Every arc is laid out in a _home frame_, its run centred straight up, and carries a `turn`
to its angle. `RadialMenu` draws each arc at home and turns it with a CSS `rotate`
transition about the SVG's origin (the centre button's centre), turning each segment's
content back so it stays upright, so a change of `angle` swings the arc round rather than
redrawing it, and segment paths cache by shape alone. Each content group is drawn at the
origin of a group translated to its segment's centre, so its turn is about that centre with
the default transform origin: iOS Safari misplaced content turned about a `fill-box` origin.
Hit-testing and the bubble use the sector turned into place (`placedOf`).

Every button is a ring sector half the ring's depth each side of its centreline, its corners
rounded by `corner` at a run's ends and beside spacers and square on an edge shared with a
neighbour; the free bubble is a circle of the innermost ring's half depth. Every shape is traced
the same way (`traced`): 72 points on its outline at 5° steps round its own centre,
clockwise from straight up, joined by lines, found by bisection along each ray against the
shape's inside test (`inSector`). A CSS `d` transition then morphs the bubble between any two
shapes point for point along those rays, with no spin whichever way the shapes face. Spans
must stay under 180° so every shape is star-shaped about its centre.

**Hit-testing** (`hit`) is polar maths from the centre: the centre button out to halfway
to the innermost ring (`button`), otherwise the first segment whose band and run cover the
point, with the rounded corners counted square. The outer half of that gap is a dead band,
on nothing, so a press there releases on nothing; `insideRing` (within the innermost ring's
inner edge, `inner`) is the deselect zone for drags, which spans the button and the whole
gap.

## The glass bubble (`Glass.tsx`)

Three layers sharing one shape: a lens, a sheen and a rim, under a drop shadow. SVG filters
cannot see what lies beneath an element, so the lens draws the menu into itself: a `<use>` of
the live arcs group, magnified 1.03× about the bubble's centre, clipped to the bubble's path
and then run through an SVG filter. The bubble's blurred silhouette is a height map, its
Sobel slope becomes a displacement field that bends the picture outward in a narrow band at
the rim like a convex lens, each colour channel bent a little differently for a chromatic
fringe, softened by a small blur and cut back to the silhouette. The defs are prefixed by a
`useId`, so menus on one page keep apart.

The bubble's shape and its place are separate. The shape (`d`) always morphs over 200ms; the
free circle is one constant path, so it never restarts the morph. The shape is set twice on
each path: as the CSS `d`, which is what transitions, and as the `d` attribute, which is what
WebKit draws (its CSS `d` was behind a flag as of iOS 18, WebKit bug 234227, so until
2026-10-19 iOS Safari showed no bubble at all); there the shape changes without a morph. The
lens's clip is drawn at the origin and carried to the bubble's place by the clipped group,
whose content is moved back, rather than by a transform on the clipPath's own child. The place is CSS: three
registered custom properties (`@property --radial-menu-*` in `RootLayout.tsx`, so they
interpolate) hold the point it is placed on (the last segment's centre, kept after leaving
it), the held pointer, and a 0–1 slider; the bubble sits at
`mouse + (placed − mouse) × slide`. Snapping onto a segment sets the placed point and slides
to 1; leaving slides to 0 with the placed point untouched, so the bubble slides from the
segment to the live pointer. The slider transitions 200ms both ways. The placed point
transitions only on a hop from one segment to another; arriving from free it jumps, since
the slider already carries the move. The pointer never transitions. `bubbleOf` in
`geometry.ts` only says what the shape is and where it is placed; nothing in JS times the
move. The bubble is drawn during a drag and kept afterwards, hidden, so it fades out in its
last shape.

Content is cloned by the `<use>` exactly as the live menu draws it, so draw icons as SVG
paths (`iconPath` in `components/Icon.tsx`) rather than foreign objects.

## Colour and states

The centre item's look is its own (the roll menu passes `Button.Cream`). Segments carry a
2px `--neutral-0` border, so the drawing is sized to include it; a segment with
`outlined={false}` paints that border in its fill instead, so it keeps its size with no
visible edge. Under the pointer a segment's `fill` lifts to `hoverFill`, and its shape and
content carry a `hovered` class so the content can lift too. `dimmed` fades a segment to
45%, and an arc with `dimOthersUnderDrag` fades its other segments while a drag sits on one.

## Animation

An arc unfolds when it mounts (opacity and scale, 150ms), which is also how the menu opens;
closing shrinks the popover's section, which `AnimateInOut` waits for. An arc's swing and its
content's counter-turn, and the bubble's morph and slide, switch off under
`prefers-reduced-motion`.

## Accessibility

The centre item should be a labelled `button`; the menu adds `aria-haspopup` and
`aria-expanded`. Each segment is a `menuitem` with its `label` and activates on Enter or
Space. The lens's copy of the menu is `aria-hidden` and outside the tab order.

## Verifying in the browser

Use the Claude in Chrome tools against the dev server. `src/holding/rollMenuTouch.html`
(gitignored, like the rest of `holding/`) mounts the roll menu alone, with no sign-in, and
logs every pointer event and activation on the page, so a phone on the LAN (`yarn dev
--host`) or headless Chromium driven with CDP touch events can try the drag; touch drags and
taps were verified that way on 2026-10-19. WebKit's rendering cannot be checked here: Chrome
with the CSS `d` stripped from the bubble's paths is the nearest stand-in. A hidden tab
freezes CSS animations and transitions: the menu stays at its opening scale, a closed dialog lingers until a screenshot
advances a frame, and morphs show only their end states, so read shapes from the DOM
(`style.d`, `style.rotate`) rather than from screenshots. Synthetic `PointerEvent`s must use
`pointerId: 1` or `setPointerCapture` throws.

## Decisions

Choices made in review of the roll menu, where this began, recorded because nothing else
records them:

- Full round caps on every arc were replaced by square-cut ends: a short arc read as a pill
  floating beside the ring.
- A plain white hover bubble became the glass lens; its displacement was then reduced and
  confined to the rim after it distorted the numerals.
- Borders went thicker and lighter, then 2px `--neutral-200`, then black (2026-10-19), as
  the dice page's cards had settled on dark surfaces with hard edges.
- The lens was first a second render of the menu inside a `<pattern>`; Firefox ignores CSS
  transforms in pattern content, so it showed a turned arc unturned. A `<use>` of the live
  menu replaced it: one definition, and the clone inherits the live menu's transitions.
- The bubble's place was first timed in JS: an eased `translate` when snapping and a tapering
  glide after leaving a segment. Retargeting that transition on every pointer report never
  let it settle, so it became the registered-property slider above.
- Shapes were first eight-point arc paths sharing one command list. Morphing the circle onto a
  segment that faced another way swung its points round the ring and read as a flip, and
  keeping the circle faced towards the last segment only hid it for some. Tracing every
  outline from its centre, clockwise from the top, made the morph direction-free and removed
  the facing state.
- The menu was first a bespoke table of named arcs with a switch per name on the React side;
  it became this description so arcs can be added or moved without touching the geometry.
  The dead band in the outer half of the gap round the button was kept: its click zone and
  the ring stay apart.
