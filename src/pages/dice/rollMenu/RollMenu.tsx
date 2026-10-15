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
  DICE,
  DIE_COLOURS,
  type DieColour,
  glyphTransform,
  HEX,
  MAX_POOL,
} from "pages/dice/dice.ts";
import { useState } from "react";

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
// Under a die's mark, the hexagon's outside edge alone, stroked: half the stroke lies under
// the cream, so 1px of black shows round it (and none round the cut-outs), whatever the
// glyph's scale. It keeps the solid cream from glaring on a light die.
const Outline = styled.path`
  fill: none;
  stroke: var(--neutral-0);
  stroke-width: 2px;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
`;
// the dice marks' size in the menu, in px
const MARK_SIZE = 30;
const glyph = (name: "Chat" | "Cog") => (
  <Glyph
    d={iconPath(name)}
    transform={`translate(${-ICON_SIZE / 2} ${-ICON_SIZE / 2}) scale(${ICON_SIZE / 24})`}
  />
);

// A radial menu round one die button: a chosen colour unfolds a count arc, and a count
// rolls. Click through it, or press the button and drag through a colour to a count: passing
// a colour chooses it, and dragging back inside the ring, or onto log or settings, drops it.
const RollMenu = ({
  className,
  disabled,
  onRoll,
  onLog,
  onSettings,
}: {
  className?: string;
  disabled?: boolean;
  onRoll: (dice: DieColour[]) => void;
  onLog: () => void;
  onSettings: () => void;
}) => {
  const menu = useModal();
  const [colour, setColour] = useState<DieColour | null>(null);
  const close = () => {
    menu.close();
    setColour(null);
  };
  // an activation that closes the menu
  const then = (act: () => void) => () => {
    act();
    close();
  };
  const pill = (name: "Chat" | "Cog", label: string, act: () => void) => (
    <Segment
      span={70}
      label={label}
      fill="var(--neutral-200)"
      hoverFill="var(--neutral-300)"
      onActivate={then(act)}
      onDragEnter={() => setColour(null)}
    >
      {glyph(name)}
    </Segment>
  );
  return (
    <RadialMenu
      className={className}
      isOpen={menu.isOpen}
      requestOpen={menu.open}
      requestClose={close}
      onDragCentre={() => setColour(null)}
    >
      {/* a 48px button, with the rings 40px deep and 12px off the button and each other */}
      <Centre diameter={48}>
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
              onActivate={() => setColour(die)}
              onDragEnter={() => setColour(die)}
            >
              {/* the die's mark, outlined, as on the die icons */}
              <Outline d={HEX} transform={glyphTransform(MARK_SIZE)} />
              <Glyph d={DICE[die].burst} fillRule="evenodd" transform={glyphTransform(MARK_SIZE)} />
            </Segment>
          ))}
        </Arc>
        <Arc angle={0}>{pill("Chat", "log", onLog)}</Arc>
        <Arc angle={270}>{pill("Cog", "settings", onSettings)}</Arc>
      </Ring>
      <Ring startDistance={88} endDistance={128}>
        {colour && (
          <Arc angle={angleOf(colour)} dimOthersUnderDrag>
            {Array.from({ length: MAX_POOL }, (_, i) => (
              <Segment
                key={i}
                span={DIE_SPAN / 2}
                label={`roll ${i + 1} ${colour} dice`}
                fill="var(--cream)"
                hoverFill="var(--white)"
                onActivate={then(() => onRoll(Array.from({ length: i + 1 }, () => colour)))}
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
