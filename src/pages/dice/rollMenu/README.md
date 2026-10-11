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
  ring, or onto log or settings, drops the choice and folds the count arc away. Releasing on a
  count rolls; on a colour keeps the menu open with it chosen; on log or settings fires the
  callback; on nothing, or back on the button, closes. A press that never leaves the button is
  a click and leaves the menu open.

The pointer is always read through `held`, which keeps it within the menu's reach. Pulled past
the outer ring, the bubble sits on the ring, and the button it sits on is what the drag means.

Pointer events are handled on one board element; the drawing takes no events of its own. A
press registers `pointermove`/`pointerup` listeners on `window` immediately (an effect-registered
listener missed fast clicks), because the dialog that opens mid-press makes the die button inert
while captured events still bubble to the window.

## Geometry (`geometry.ts`)

Angles are degrees, 0 to the right and 90 up; screen y is flipped in `point`. Every button is a
ring sector `CAP` (20px) deep each side of its ring, its corners rounded by `CORNER` (6px) at an
arc's ends and square on an edge shared with a neighbour; the free bubble is a `CAP` circle.
Every shape is traced the same way (`traced`): 72 points on its outline at 5° steps round its
own centre, clockwise from straight up, joined by lines, found by bisection along each ray
against the shape's inside test (`inSector`). A CSS `d` transition then morphs the bubble
between any two shapes point for point along those rays, with no spin whichever way the
shapes face. Button paths are cached, since the menu redraws on every hover change.

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
  otherwise the first button whose band and run cover the point, with the rounded corners
  counted square. `insideRing` is the deselect zone for drags.

The die button sits 113px from the page's bottom and right edges (`DiceRoller.tsx`), measured so
the count arc swung to blue or orange clears the edge by 8px.

## The glass bubble

Three layers sharing one shape: a lens, a sheen and a rim, under a drop shadow. SVG filters
cannot see what lies beneath an element, so the lens draws the menu into itself: a `<use>` of
the live menu group, magnified 1.03× about the bubble's centre, clipped to the bubble's path and
then run through an SVG filter. The bubble's blurred silhouette is a height map, its Sobel slope
becomes a displacement field that bends the picture outward in a narrow band at the rim like a
convex lens, each colour channel bent a little differently for a chromatic fringe, softened by a
small blur and cut back to the silhouette.

The bubble's shape and its place are separate. The shape (`d`) always morphs over 200ms; the
free circle is one constant path, so it never restarts the morph. The place is CSS: three
registered custom properties on the drawing (`@property` in `RootLayout.tsx`, so they
interpolate) hold the point it is placed on (the last button's centre, kept after leaving it),
the held pointer, and a 0–1 slider; the bubble sits at
`mouse + (placed − mouse) × slide`. Snapping onto a button sets the placed point and slides to
1; leaving slides to 0 with the placed point untouched, so the bubble slides from the button to
the live pointer. The slider transitions 200ms both ways. The placed point transitions only on
a hop from one button to another; arriving from free it jumps, since the slider already
carries the move. The pointer never transitions. `bubbleOf` in `geometry.ts` only says what the
shape is and where it is placed; nothing in JS times the move. The bubble is drawn during a
drag and kept afterwards, hidden, so it fades out in its last shape.

Pill icons are drawn as SVG paths (`iconPath` in `components/Icon.tsx`) so the `<use>` clone
renders them exactly as the live menu does.

## Colour and states

Die colours come from `dice.ts`; `RootLayout.tsx` holds a 300–700 ramp round each (`--cyan`,
`--magenta`, `--orange`, 500 being the die's own colour). Buttons use 500, hover 600; the count
arc is cream and hovers white; the pills and all borders are `--neutral-200`. A chosen die dims
the other two to 45%, and while a drag sits on a count the other counts dim the same way.
Buttons carry a 2px border, so the drawing is sized to include it.

## Accessibility

The die button is a labelled `button` with `aria-haspopup` and `aria-expanded`. Each arc button
is a `menuitem` with a label such as "roll 3 blue dice" and activates on Enter or Space. The
lens's copy of the menu is `aria-hidden` and outside the tab order. The open, unfold and swing
animations and the bubble's morph and slide switch off under `prefers-reduced-motion`.

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
- The lens was first a second render of the menu inside a `<pattern>`; Firefox ignores CSS
  transforms in pattern content, so it showed the count arc unturned. A `<use>` of the live
  menu replaced it: one definition, and the clone inherits the live menu's transitions.
- The bubble's place was first timed in JS: an eased `translate` when snapping and a tapering
  glide after leaving a button. Retargeting that transition on every pointer report never let
  it settle, so it became the registered-property slider above.
- Shapes were first eight-point arc paths sharing one command list. Morphing the circle onto a
  button that faced another way swung its points round the ring and read as a flip on the
  settings pill, and keeping the circle faced towards the last button only hid it for the
  dice. Tracing every outline from its centre, clockwise from the top, made the morph
  direction-free and removed the facing state.
