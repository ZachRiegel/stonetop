import styled from "@emotion/styled";
import { Canvas } from "@react-three/fiber";
import Font from "components/Font.tsx";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import useModal from "hooks/useModal.ts";
import {
  DIE_SHARE,
  EYE,
  FADE_SECONDS,
  FRAME_RATE,
  PLAYBACK_RATE,
  type RollResult,
  score,
} from "pages/dice/dice.ts";
import DiceScene from "pages/dice/DiceScene.tsx";
import DiceSettingsModal from "pages/dice/DiceSettingsModal.tsx";
import { clearAfter } from "pages/dice/preferences.ts";
import { take } from "pages/dice/rollCache.ts";
import RollLog from "pages/dice/RollLog.tsx";
import RollMenu from "pages/dice/rollMenu/RollMenu.tsx";
import RollNotification from "pages/dice/RollNotification.tsx";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import { MathUtils } from "three";

// Perspective, looking straight down at the floor (z = 0, screen right = +x, screen up = +y)
// from EYE dice up: the field of view is chosen so that, with a die DIE_SHARE of the canvas
// height, the camera is that many dice above the floor whatever the canvas size (the scene
// measures the floor at the origin plane, and a die's size follows from it). The frustum's
// sides then meet the floor on the arena's edges, where the worker leans the walls.
const CAMERA = {
  position: [0, 0, 20] as const,
  fov: MathUtils.radToDeg(2 * Math.atan(1 / (2 * DIE_SHARE * EYE))),
  near: 1,
  far: 100,
};

// one cell: the transparent render floats over the page's dark grey, the UI on top of both
const Page = styled.div`
  height: 100%;
  overflow: hidden;
  background-color: var(--neutral-100);
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
  padding: 16px 24px;
`;

const Hint = styled(Font.Italic16)`
  place-self: center;
`;

// in the page's corner, leaving 8px between the page edge and the lowest (or rightmost)
// point of the count arc swung to blue (or orange), measured in the browser
const Menu = styled(RollMenu)`
  grid-area: 3 / 1;
  justify-self: end;
  align-self: end;
  margin: 0 89px 89px 0;
`;

// Every roll in the campaign plays here, whoever threw it: the campaign's next seed is
// simulated ahead of time, the menu posts a roll message with it, and the message
// comes back through the subscription to be played, on this screen and everyone else's.
// Once the dice settle a notification blooms over the menu's button with the result; its X
// clears this screen's table (the roll stays on everyone else's), as does a timer set in the
// page's settings. The menu's log button opens a side panel of the campaign's recent rolls,
// its settings button a modal with the page's settings.
const DiceRoller = () => {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const message = useQuery(api.messages.latest, { campaignId, kind: "roll" });
  // narrowed to a roll, so the page still reads it as one once other kinds exist
  const latest = message && message.kind !== "roll" ? null : message;
  const roll = useMutation(api.messages.roll);
  const log = useModal();
  const settings = useModal();
  const [result, setResult] = useState<RollResult>();
  // the roll whose card is up, from its bloom (once the dice have settled; `at` is then) until
  // the menu's button, an X meanwhile, or the clear timer takes it off this table; and a card
  // taken while a newer roll was still in the air, which wilts on its own and leaves the new
  // roll be
  const [arrived, setArrived] = useState<{ id: string; at: number }>();
  const [dismissed, setDismissed] = useState<string>();
  const seconds = useSyncExternalStore(clearAfter.subscribe, clearAfter.get);
  // undefined for Never
  const clearSeconds = Number.isFinite(seconds) ? seconds : undefined;
  // the roll on the table (null for none), undefined until the first query result: the
  // roll already over when the page opened is left off the table, every later one is played
  const shown = useRef<string | null>(undefined);

  useEffect(() => {
    if (latest === undefined) return;
    // the first result is only noted, so the roll already over is not played
    if (shown.current === undefined) {
      shown.current = latest && latest._id;
      return;
    }
    if (latest === null || shown.current === latest._id) return;
    shown.current = latest._id;
    take(latest.seed, latest.dice.length).then(
      (simulation) => {
        // a simulation that lands after a newer roll has replaced this one is left unplayed
        if (shown.current !== latest._id) return;
        setResult({
          id: latest._id,
          simulation,
          dice: latest.dice.map((colour, i) => ({ colour, face: latest.faces[i] ?? 0 })),
          author: latest.author,
          time: latest._creationTime,
        });
      },
      // the page closed while it was waiting
      () => undefined,
    );
  }, [latest]);

  // takes the arrived card's roll off this table, for the X and the timer alike
  const dismiss = useCallback(() => {
    if (arrived === undefined) return;
    if (arrived.id === result?.id) setResult(undefined);
    else setDismissed(arrived.id);
    setArrived(undefined);
  }, [arrived, result]);
  useEffect(() => {
    if (arrived === undefined || clearSeconds === undefined) return;
    // an absolute deadline, so a re-run (a newer roll changing `dismiss`) does not restart
    // the clock, and a changed setting moves it
    const timer = setTimeout(dismiss, arrived.at + clearSeconds * 1000 - Date.now());
    return () => clearTimeout(timer);
  }, [arrived, clearSeconds, dismiss]);

  return (
    <Page>
      <Canvas
        flat
        shadows="soft"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={CAMERA}
      >
        <DiceScene result={result} seed={campaign?.rollSeed} />
      </Canvas>
      <Overlay>
        <Toolbar>
          <Font.Title32 element="h1" text="Dice Roller" />
        </Toolbar>
        {latest === null ? <Hint element="div" text="Choose your dice, then roll" /> : <div />}
        {/* the roll on the table: a newer roll's card is laid over it once that roll has
            played; the menu's button, over the card's edge, is an X meanwhile that takes the
            roll off this table alone (`shown` still holds its id, so the subscription does
            not play it again) */}
        <RollNotification
          isOpen={result !== undefined}
          dismissed={dismissed}
          onArrive={(id) => setArrived({ id, at: Date.now() })}
          roll={
            result && {
              id: result.id,
              author: result.author,
              time: result.time,
              dice: result.dice.map(({ colour }) => colour),
              totals: score(result.dice),
              // once the faces have settled and faded (wall-clock; a stalled tab's playback
              // is clamped and may land a little after)
              delaySeconds:
                result.simulation.frameCount / FRAME_RATE / PLAYBACK_RATE + FADE_SECONDS,
              clearSeconds,
            }
          }
        />
        <Menu
          disabled={!campaign}
          // a roll is in the air from its first frame until its card blooms
          locked={result !== undefined && arrived?.id !== result.id}
          onRoll={(dice) => {
            if (!campaign) return;
            // the roll comes back through the subscription; a seed another player's roll
            // has just replaced is declined, and their roll plays instead
            roll({ campaignId: campaign._id, seed: campaign.rollSeed, dice }).catch(
              (error: unknown) => {
                if (!(error instanceof ConvexError && error.data.code === "SEED_CONFLICT"))
                  throw error;
              },
            );
          }}
          onLog={log.open}
          onSettings={settings.open}
          onDismiss={arrived === undefined ? undefined : dismiss}
        />
        <RollLog isOpen={log.isOpen} requestClose={log.close} campaignId={campaignId} />
        <DiceSettingsModal isOpen={settings.isOpen} requestClose={settings.close} />
      </Overlay>
    </Page>
  );
};

export default DiceRoller;
