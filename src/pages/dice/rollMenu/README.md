# Roll menu

The radial menu round the die button on the dice page. It is how a player picks a colour and a
count of dice to roll, and where the log and settings buttons live. `RollMenu.tsx` declares it
on the generic radial menu in `components/radialMenu/` (its README has the layout model, the
drag gesture and the glass bubble); this folder holds only what the roll menu says. The page
(`../DiceRoller.tsx`) places the button and turns `onRoll` into the `messages.roll` mutation;
the menu knows nothing about rolling itself.

## What it declares

- **The centre**: a `Button.Cream` (`components/Button.tsx`) with the die icon a size up,
  in a 48px cell, labelled "Roll dice". Given `onDismiss`, the die morphs into an X
  (`DieOrClose.tsx`: one path of points traced by `geometry.ts`'s `traced`, as the bubble's
  shapes are, so a CSS `d` transition carries the square's outline onto the cross and closes
  the pips; switched by `data-closing` on the button), the label becomes "Clear the dice",
  and a click calls `onDismiss`; the menu's `requestOpen` is withheld, so a press neither
  opens it nor starts a drag (one from the X could otherwise reach a count). While `locked`
  (the page passes it for a roll in the air) `requestOpen` is withheld the same way, the
  button unchanged to look at, and the menu closes if it was open.
- **Ring 1** (36px to 76px out, so 12px off the button): three 45° dice segments on an arc
  centred at 135°, so blue sits straight left and orange straight above; a 70° log pill
  straight right; a 70° settings pill straight below. The gaps are unequal by design (32.5°
  beside the dice, 20° between the pills) so the icons line up with the button.
- **Ring 2** (88px to 128px out): the count arc, five 22.5° segments, present only
  while a colour is chosen and centred on that die's line (`angleOf`), so a change of die
  swings it round. It has `dimOthersUnderDrag`: while a drag sits on a count the others dim.
- Dice fill from the 300–700 ramps round each die colour in `RootLayout.tsx` (`--cyan`,
  `--magenta`, `--orange`; 500 is the die's own colour, 600 the hover); counts are `--cream`
  and hover `--white`; the pills are `--neutral-200` and hover `--neutral-300`. A chosen die
  dims the other two.
- Content: each die's burst mark (`DICE[colour].burst` from `dice.ts`, 30px, fitted by
  `glyphTransform`) with a 0.75px black outline, so the solid cream does not glare on a
  light die; a bold numeral per count; and the Chat and Cog
  icons as paths (`iconPath` in `components/Icon.tsx`). The die icons in `icons/` draw the
  same mark the same way.

## Rules

- Clicking, or dragging onto, a die colour chooses it; the count arc unfolds beside it and
  the menu stays open.
- Clicking or releasing on a count rolls that many dice of the colour and closes.
- Log opens the page's roll log panel (`../RollLog.tsx`), settings the page's settings modal
  (`../DiceSettingsModal.tsx`); both close the menu. Dragging onto either drops the chosen
  colour, as does dragging back into the centre zone.
- A release on nothing, Escape, or a click outside closes and forgets the colour.

The die button's centre sits 113px from the page's bottom and right edges (an 89px margin on
its 48px cell in `DiceRoller.tsx`), measured so the count arc swung to blue or orange clears
the edge by 8px. The roll notification (`../RollNotification.tsx`) lays the middle of its
right edge on that spot, under the button, which is the X until pressed.

## Decisions

- The count arc was halved from 45° to 22.5° per button, and swung onto the chosen die's line
  rather than fixed over the dice.
- The resting bubble on the chosen die was dropped; dimming shows the choice, the bubble is
  for drags.
- The marks' drop shadow went, for the outline, and the marks shrank from 34px to 30px: the
  plain hexagon on blue read too bright. Cut-outs in the hexagon (circles, polygons, lines)
  were tried and dropped: the hexagon is plain, and the colour alone tells the dice apart.
