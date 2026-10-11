# Roll menu

The radial menu round the die button on the dice page. It is how a player picks a colour and a
count of dice to roll, and where the log and settings buttons live. `RollMenu.tsx` is the React
component and styling; `geometry.ts` is the pure layout, path and hit-testing maths it draws
from, pinned by `geometry.test.ts`. The page (`../DiceRoller.tsx`) places the button and turns
`onRoll` into the `messages.roll` mutation; the menu knows nothing about rolling itself.

## Interaction model

Two ways to use it, sharing one hit-test:

- **Click mode.** Click the die button to open the menu. Hovering lifts a button's fill one
  palette step and sets the pointer cursor. Clicking a die colour chooses it and dims the other
  two; the count arc unfolds beside it. Clicking a count rolls that many dice of the colour and
  closes. Clicking log or settings calls its callback (no-ops today) and closes. Escape, a click
  outside, and a click on the now-inert die button close it; those come from the `Popover`
  (`components/Popover.tsx`), which holds the open menu in a modal `<dialog>` and returns focus.
- **Drag mode.** Press on the die button and drag. A glass bubble follows the pointer, snapping
  onto whatever button it passes. Passing a colour chooses it; dragging back inside the first
  ring drops the choice. Releasing on a count rolls; on a colour keeps the menu open with it
  chosen; on log or settings fires the callback; on nothing, or back on the button, closes. A
  press that never leaves the button is a click and leaves the menu open.

The pointer is always read through `held`, which keeps it within the menu's reach. Pulled past
the outer ring, the bubble sits on the ring, and the button it sits on is what the drag means.

Pointer events are handled on one board element; the drawing takes no events of its own. A
press registers `pointermove`/`pointerup` listeners on `window` immediately (an effect-registered
listener missed fast clicks), because the dialog that opens mid-press makes the die button inert
while captured events still bubble to the window.

## Geometry (`geometry.ts`)

Angles are degrees, 0 to the right and 90 up; screen y is flipped in `point`. Every button is a
ring sector `CAP` (20px) deep each side of its ring, drawn as one eight-point path: outer arc,
corner, end edge, corner, inner arc, corner, start edge, corner. Corner radii are 0 on an edge
shared with a neighbour, `CORNER` (6px) on an arc's ends, or `CAP` for the bubble's full
half-round, which with no straight run is a circle. Every shape uses the same commands, traced
the same way round, so a CSS `d` transition can morph the bubble between any of them.

- **Ring 1** (radius 56 = button 24 + gap 12 + cap 20): three 45° dice buttons with blue centred
  straight left of the button and orange straight above; a 70° log pill centred straight right;
  a 70° settings pill centred straight below. The gaps are unequal by design (32.5° beside the
  dice, 20° between the pills) so the icons line up with the button.
- **Ring 2** (radius 108): the count arc, five 22.5° buttons, drawn once centred on the middle
  die (`COUNT_ARC`) and turned by `countTurn` so its middle button sits on the line through the
  chosen die. `arcsOf(colour)` returns the turned arc for hit-testing; the component turns the
  drawn one with a CSS `rotate` transition and turns the numerals back so they stay upright,
  which is why a change of die swings the arc round instead of unfolding a new one.
- **Hit-testing** (`hit`) is polar maths from the die button's centre: the button within 30px,
  otherwise the first button whose band and run cover the point, round caps included and
  square-cut ends counted to their edge. `insideRing` is the deselect zone for drags.

The die button sits 113px from the page's bottom and right edges (`DiceRoller.tsx`), measured so
the count arc swung to blue or orange clears the edge by 8px.

## The glass bubble

Three paths sharing one shape: a lens, a sheen and a rim, under a drop shadow. The lens is filled
with a pattern holding a second, non-interactive copy of the menu magnified 1.03× about the
bubble's centre, run through an SVG filter: the bubble's blurred silhouette is a height map,
its Sobel slope becomes a displacement field that bends the picture outward in a narrow band at
the rim like a convex lens, each colour channel bent a little differently for a chromatic
fringe, softened by a small blur and cut back to the silhouette. The pattern tile is twice the
drawing so the lens never shows a repeat. The shape transition is 200ms when snapping onto a
button and 0ms while following the pointer. The bubble only exists during a drag.

Pill icons are drawn as SVG paths (`iconPath` in `components/Icon.tsx`) because `foreignObject`
does not render inside a pattern.

## Colour and states

Die colours come from `dice.ts`; `RootLayout.tsx` holds a 300–700 ramp round each (`--cyan`,
`--magenta`, `--orange`, 500 being the die's own colour). Buttons use 500, hover 600; the count
arc is cream and hovers white; the pills and all borders are `--neutral-200`. A chosen die dims
the other two to 45%. Buttons carry a 2px border, so the drawing is sized to include it.

## Accessibility

The die button is a labelled `button` with `aria-haspopup` and `aria-expanded`. Each arc button
is a `menuitem` with a label such as "roll 3 blue dice" and activates on Enter or Space. The
lens's copy of the menu is `aria-hidden` and outside the tab order. The open, unfold and swing
animations and transitions switch off under `prefers-reduced-motion`.

## Verifying in the browser

Use the Claude in Chrome tools against the dev server. A hidden tab freezes CSS animations and
transitions: the menu stays at its opening scale, a closed dialog lingers until a screenshot
advances a frame, and morphs show only their end states, so read shapes from the DOM
(`style.d`, `style.rotate`) rather than from screenshots. Synthetic `PointerEvent`s must use
`pointerId: 1` or `setPointerCapture` throws.

## Decisions

Choices made in review, recorded because nothing else records them:

- Full round caps on every arc were replaced by square-cut ends: the short count arc read as a
  pill floating beside the ring.
- The count arc was halved from 45° to 22.5° per button, and swung onto the chosen die's line
  rather than fixed over the dice.
- The resting bubble on the chosen die was dropped; dimming shows the choice, the bubble is for
  drags.
- A plain white hover bubble became the glass lens; its displacement was then reduced and
  confined to the rim after it distorted the numerals.
- Borders went thicker and lighter, then 2px `--neutral-200`, the same as the pill fill.
