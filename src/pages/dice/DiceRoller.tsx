import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { Canvas } from "@react-three/fiber";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import CrtEffect from "pages/dice/CrtEffect.tsx";
import {
  DIE_COLOURS,
  type DieColour,
  type DieSymbol,
  FADE_SECONDS,
  FRAME_RATE,
  MAX_POOL,
  PLAYBACK_RATE,
  PULSE_SECONDS,
  type RollResult,
  SYMBOLS,
} from "pages/dice/dice.ts";
import DiceScene from "pages/dice/DiceScene.tsx";
import DieCounter from "pages/dice/DieCounter.tsx";
import { take } from "pages/dice/rollCache.ts";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { MathUtils, Vector3 } from "three";

import { api } from "../../../convex/_generated/api";

const LABELS: Record<DieSymbol, string> = { burst: "Bursts", special: "Specials", skull: "Fails" };

// orthographic, looking down at the floor (z = 0, screen right = +x, screen up = +y) with a
// slight tilt so the right and far sides of a resting die just show; aimed at the origin
const TILT = MathUtils.degToRad(5);
const CAMERA = {
  position: new Vector3(0, 0, 20)
    .applyAxisAngle(new Vector3(0, 1, 0), TILT)
    .applyAxisAngle(new Vector3(1, 0, 0), -TILT),
  zoom: 180,
  near: 0.1,
  far: 100,
};

// one cell: the CRT-filtered render fills the whole backdrop, the UI floats on top
const Page = styled.div`
  height: 100%;
  overflow: hidden;
  background-color: var(--neutral-0);
  display: grid;

  & > * {
    grid-area: 1 / 1;
    min-width: 0;
    min-height: 0;
  }
`;

// positioned so it paints above the canvas wrapper, which react-three-fiber positions itself
const Overlay = styled.div`
  position: relative;
  display: grid;
  grid-template-rows: max-content 1fr max-content;
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: center;
  padding: 16px 24px;
`;

const Counters = styled.div`
  display: grid;
  grid-auto-flow: column;
  justify-content: center;
  column-gap: 32px;
`;

const Hint = styled(Font.Italic16)`
  place-self: center;
`;

const Footer = styled.div`
  display: grid;
  grid-template-columns: 1fr max-content;
  align-items: center;
  padding: 16px 24px 24px;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    translate: 0 8px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
`;

// fades in as the rolled faces pulse (wall-clock; a stalled tab's playback is clamped
// and may land a little after the numbers)
const Readout = styled.div<{ delaySeconds: number }>`
  display: grid;
  grid-auto-flow: column;
  justify-self: center;
  align-items: center;
  column-gap: 32px;
  padding: 12px 24px;
  border-radius: 16px;
  background-color: rgb(0 0 0 / 0.3);
  animation: ${fadeIn} ${PULSE_SECONDS}s ${({ delaySeconds }) => delaySeconds}s both;

  @media (prefers-reduced-motion: reduce) {
    animation-delay: 0ms;
  }
`;

const Stat = styled.div`
  display: grid;
  justify-items: center;
`;

const Roller = styled.div`
  display: grid;
  grid-template-columns: max-content max-content;
  align-items: center;
  column-gap: 8px;
`;

const Avatar = styled.img`
  width: 30px;
  height: 30px;
  border: 2px solid var(--neutral-0);
  border-radius: 999px;
  object-fit: cover;
`;

const RollButton = styled(Button.Primary)`
  min-width: 160px;

  &:where(:disabled) {
    opacity: 0.4;
  }
`;

// Every roll in the campaign plays here, whoever threw it: the campaign's next seed is
// simulated ahead of time, a Roll click records a roll with it, and the roll comes back
// through the subscription to be played, on this screen and everyone else's.
const DiceRoller = () => {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const latest = useQuery(api.rolls.latest, { campaignId });
  const roll = useMutation(api.rolls.roll);
  const [counts, setCounts] = useState<Record<DieColour, number>>({
    blue: 1,
    violet: 1,
    orange: 1,
  });
  const [result, setResult] = useState<RollResult>();
  // the roll on the table (null for none), undefined until the first query result: the
  // roll already there when the page opened is drawn at rest, every later one is played
  const shown = useRef<string | null>(undefined);
  const pool = DIE_COLOURS.flatMap((colour) =>
    Array.from({ length: counts[colour] }, () => colour),
  );

  useEffect(() => {
    if (latest === undefined) return;
    const settled = shown.current === undefined;
    if (latest === null) {
      shown.current ??= null;
      return;
    }
    if (shown.current === latest._id) return;
    shown.current = latest._id;
    take(latest.seed, latest.dice.length).then(
      (simulation) => {
        // a simulation that lands after a newer roll has replaced this one is left unplayed
        if (shown.current !== latest._id) return;
        setResult({
          id: latest._id,
          simulation,
          dice: latest.dice.map((colour, i) => ({ colour, face: latest.faces[i] ?? 0 })),
          roller: latest.roller,
          settled,
        });
      },
      // the page closed while it was waiting
      () => undefined,
    );
  }, [latest]);

  return (
    <Page>
      <Canvas flat orthographic dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={CAMERA}>
        <color attach="background" args={["#000000"]} />
        <DiceScene result={result} seed={campaign?.rollSeed} />
        <CrtEffect />
      </Canvas>
      <Overlay>
        <Toolbar>
          <Font.Title32 element="h1" text="Dice Roller" />
          <Counters>
            {DIE_COLOURS.map((colour) => (
              <DieCounter
                key={colour}
                colour={colour}
                count={counts[colour]}
                max={counts[colour] + MAX_POOL - pool.length}
                setCount={(count) => setCounts((previous) => ({ ...previous, [colour]: count }))}
              />
            ))}
          </Counters>
        </Toolbar>
        {latest === null ? <Hint element="div" text="Choose your dice, then roll" /> : <div />}
        <Footer>
          {result && latest?._id === result.id ? (
            <Readout
              key={result.id}
              aria-live="polite"
              delaySeconds={
                result.settled
                  ? 0
                  : result.simulation.frameCount / FRAME_RATE / PLAYBACK_RATE + FADE_SECONDS
              }
            >
              <Roller>
                <Avatar src={result.roller.picture} alt="" />
                <Font.Bold16 element="div" text={result.roller.displayName} />
              </Roller>
              {SYMBOLS.map((symbol) => (
                <Stat key={symbol}>
                  <Font.Title40 element="div" text={String(latest.totals[symbol])} />
                  <Font.Bold16 element="div" text={LABELS[symbol]} />
                </Stat>
              ))}
            </Readout>
          ) : (
            <div />
          )}
          <RollButton
            text="Roll"
            disabled={pool.length === 0 || !campaign}
            onClick={() =>
              campaign
                ? // the roll comes back through the subscription; a seed another player's
                  // roll has just replaced is declined, and their roll plays instead
                  roll({ campaignId: campaign._id, seed: campaign.rollSeed, dice: pool }).catch(
                    (error: unknown) => {
                      if (!(error instanceof ConvexError && error.data.code === "SEED_CONFLICT"))
                        throw error;
                    },
                  )
                : undefined
            }
          />
        </Footer>
      </Overlay>
    </Page>
  );
};

export default DiceRoller;
