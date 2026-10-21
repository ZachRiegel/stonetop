// The roll menu, declared on components/radialMenu: dice colours up and to the left, log
// right, settings below, and a count arc that swings onto the chosen die. README.md has
// what it declares and why.
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import { FontCSS } from "components/Font.tsx";
import Icon, { iconPath } from "components/Icon.tsx";
import Arc from "components/radialMenu/Arc.tsx";
import Centre from "components/radialMenu/Centre.tsx";
import RadialMenu from "components/radialMenu/RadialMenu.tsx";
import Ring from "components/radialMenu/Ring.tsx";
import Segment from "components/radialMenu/Segment.tsx";
import useModal from "hooks/useModal.ts";
import {
  byColour,
  DICE,
  DIE_COLOURS,
  type DieColour,
  glyphTransform,
  MAX_POOL,
} from "pages/dice/dice.ts";
import { useCallback, useEffect, useMemo, useState } from "react";

// the die button's cell, and its margin from the page's corner: 8px between the page edge
// and the lowest (or rightmost) point of the count arc swung to blue (or orange), measured
// in the browser. The page places the cell; the roll log and notification build on it.
export const CELL = 48;
export const MARGIN = 89;

// the dice arc is centred up and to the left, 45° a die, so blue sits straight left and
// orange straight above (README.md has the rings' angles and why the gaps are unequal)
const DICE_ANGLE = 135;
const DIE_SPAN = 45;
// the angle through a die's centre: the dice run clockwise from blue
const angleOf = (colour: DieColour) =>
  DICE_ANGLE + DIE_SPAN * ((DIE_COLOURS.length - 1) / 2 - DIE_COLOURS.indexOf(colour));

// the palette ramp (RootLayout.tsx) behind each die colour; a fill lifts a step on hover
const RAMPS: Record<DieColour, string> = { blue: "cyan", violet: "magenta", orange: "orange" };

// the menu's icons are a size up from a Button's own
const ICON_SIZE = 28;
const DieButton = styled(Button.Cream)`
  --icon-size: ${ICON_SIZE}px;
`;

const Numeral = styled.text`
  ${FontCSS.Bold20}
  fill: var(--neutral-100);
  text-anchor: middle;
  dominant-baseline: central;
`;

// an icon drawn as a path (a die's burst mark, or a material-symbols icon), so the menu's
// glass lens renders it the same way
const Glyph = styled.path`
  fill: var(--cream);
`;
// a pill's icon lifts to white with the pill under the pointer (the user, 2026-10-19: the
// whole pill lifts, not the fill alone); the dice marks stay cream on their lifted fills
const PillGlyph = styled(Glyph)`
  transition: fill 150ms ease-out;

  .hovered > & {
    fill: var(--white);
  }
`;
// a die's mark: a hairline of black round it, whatever the glyph's scale
const Mark = styled(Glyph)`
  stroke: var(--neutral-0);
  stroke-width: 0.75px;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
`;
// the dice marks' size in the menu, in px
const MARK_SIZE = 30;

// A radial menu round one die button: a chosen colour unfolds a count arc, and a count
// rolls. Click through it, or press the button and drag through a colour to a count: passing
// a colour chooses it, and dragging back inside the ring, or onto log or settings, drops it.
// `onOpen` hears the menu open: the page takes the roll notification, which lies over the
// button's spot, off the table then. While `locked` (a roll is being thrown) the button
// looks as it does but a press does nothing, and the menu closes if it was open.
const RollMenu = ({
  className,
  disabled,
  locked,
  onRoll,
  onLog,
  onSettings,
  onOpen,
}: {
  className?: string;
  disabled?: boolean;
  locked?: boolean;
  onRoll: (dice: DieColour[]) => void;
  onLog: () => void;
  onSettings: () => void;
  onOpen?: () => void;
}) => {
  const { isOpen, open: openMenu, close: closeMenu } = useModal();
  const [colour, setColour] = useState<DieColour | null>(null);
  const open = useCallback(() => {
    openMenu();
    onOpen?.();
  }, [openMenu, onOpen]);
  const close = useCallback(() => {
    closeMenu();
    setColour(null);
  }, [closeMenu]);
  useEffect(() => {
    if (locked) close();
  }, [locked, close]);
  const clearColour = useCallback(() => setColour(null), []);
  // one chooser per colour, made once
  const choose = useMemo(() => byColour((die) => () => setColour(die)), []);
  // the pills and the counts close the menu as they act
  const openLog = useCallback(() => {
    onLog();
    close();
  }, [onLog, close]);
  const openSettings = useCallback(() => {
    onSettings();
    close();
  }, [onSettings, close]);
  // the count arc's rolls of the chosen colour, one to MAX_POOL dice
  const rolls = useMemo(
    () =>
      colour === null
        ? []
        : Array.from({ length: MAX_POOL }, (_, i) => () => {
            onRoll(Array.from({ length: i + 1 }, () => colour));
            close();
          }),
    [colour, onRoll, close],
  );
  const pill = (name: "Chat" | "Cog", label: string, onActivate: () => void) => (
    <Segment
      span={70}
      label={label}
      fill="var(--neutral-150)"
      hoverFill="var(--neutral-250)"
      outlined={false}
      onActivate={onActivate}
      onDragEnter={clearColour}
    >
      <PillGlyph
        d={iconPath(name)}
        transform={`translate(${-ICON_SIZE / 2} ${-ICON_SIZE / 2}) scale(${ICON_SIZE / 24})`}
      />
    </Segment>
  );
  return (
    <RadialMenu
      className={className}
      isOpen={isOpen}
      requestOpen={locked ? undefined : open}
      requestClose={close}
      onDragCentre={clearColour}
    >
      {/* the rings are 40px deep and 12px off the button and each other */}
      <Centre diameter={CELL}>
        <DieButton Icon={Icon.Die} aria-label="Roll dice" disabled={disabled} />
      </Centre>
      <Ring startDistance={36} endDistance={76}>
        <Arc angle={DICE_ANGLE}>
          {DIE_COLOURS.map((die) => (
            <Segment
              key={die}
              span={DIE_SPAN}
              label={`${die} dice`}
              fill={`var(--${RAMPS[die]}-500)`}
              hoverFill={`var(--${RAMPS[die]}-600)`}
              dimmed={colour !== null && colour !== die}
              onActivate={choose[die]}
              onDragEnter={choose[die]}
            >
              {/* the die's mark, outlined, as on the die icons */}
              <Mark d={DICE[die].burst} fillRule="evenodd" transform={glyphTransform(MARK_SIZE)} />
            </Segment>
          ))}
        </Arc>
        <Arc angle={0}>{pill("Chat", "log", openLog)}</Arc>
        <Arc angle={270}>{pill("Cog", "settings", openSettings)}</Arc>
      </Ring>
      <Ring startDistance={88} endDistance={128}>
        {colour && (
          <Arc angle={angleOf(colour)} dimOthersUnderDrag>
            {rolls.map((roll, i) => (
              <Segment
                key={i}
                span={DIE_SPAN / 2}
                label={`roll ${i + 1} ${colour} dice`}
                fill="var(--cream)"
                hoverFill="var(--white)"
                onActivate={roll}
              >
                <Numeral>{i + 1}</Numeral>
              </Segment>
            ))}
          </Arc>
        )}
      </Ring>
    </RadialMenu>
  );
};

export default RollMenu;
