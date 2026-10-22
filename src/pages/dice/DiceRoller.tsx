import styled from "@emotion/styled";
import { Canvas } from "@react-three/fiber";
import Font from "components/Font.tsx";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import useModal from "hooks/useModal.ts";
import { MEDIA } from "hooks/useResponsiveSize.ts";
import {
  DIE_SHARE,
  type DieColour,
  EYE,
  FADE_SECONDS,
  rolledOf,
  type RollResult,
  score,
  secondsAt,
} from "pages/dice/dice.ts";
import DiceScene from "pages/dice/DiceScene.tsx";
import DiceSettings from "pages/dice/DiceSettings.tsx";
import { clearAfter } from "pages/dice/preferences.ts";
import { take } from "pages/dice/rollCache.ts";
import RollLog, { type LogPhase } from "pages/dice/RollLog.tsx";
import RollMenu, { MARGIN, MOBILE_MARGIN } from "pages/dice/rollMenu/RollMenu.tsx";
import RollNotification from "pages/dice/RollNotification.tsx";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
// the renderer: transparent over the page, at up to twice the CSS pixel density
const GL = { alpha: true, antialias: true };
const DPR: [number, number] = [1, 2];

// one cell: the transparent render floats over the page's ground, the UI on top of both. A
// faint rule along the top marks where the table starts under the strip, since the dice
// bounce off that edge (user, 2026-10-19).
const Page = styled.div`
  height: 100%;
  overflow: hidden;
  border-top: 1px solid var(--neutral-100);
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
  grid-template-rows: 1fr max-content;
`;

const Hint = styled(Font.Italic16)`
  place-self: center;
`;

// in the page's corner, by the menu's own measure: nearer it on a phone, where the menu is
// smaller
const Menu = styled(RollMenu)`
  grid-area: 2 / 1;
  justify-self: end;
  align-self: end;
  margin: 0 ${MARGIN}px ${MARGIN}px 0;

  @media ${MEDIA.mobile} {
    margin: 0 ${MOBILE_MARGIN}px ${MOBILE_MARGIN}px 0;
  }
`;

// Every roll in the campaign plays here, whoever threw it: the campaign's next seed is
// simulated ahead of time, the menu posts a roll message with it, and the message
// comes back through the subscription to be played, on this screen and everyone else's.
// Once the dice settle a notification blooms over the menu's button with the result; a click
// on it clears this screen's table (the roll stays on everyone else's), as does opening the
// menu to roll again, or a timer set in the page's settings. The menu's log button opens
// the campaign's recent rolls as a stack of cards over the button (a roll landing meanwhile
// joins the stack and gets no card), its settings button a card off the die with the page's
// settings.
const DiceRoller = () => {
  const { campaignId = "" } = useParams();
  const campaign = useQuery(api.campaigns.get, { campaignId });
  const message = useQuery(api.messages.latest, { campaignId, kind: "roll" });
  // narrowed to a roll, so the page still reads it as one once other kinds exist
  const latest = message && message.kind !== "roll" ? null : message;
  const roll = useMutation(api.messages.roll);
  const [log, setLog] = useState<LogPhase>("closed");
  const { isOpen: settingsOpen, open: openSettings, close: _closeSettings } = useModal();
  // the roll playing on the table and when it began playing; its card blooms once the dice
  // have settled, unless the settings were up then (no results while they are, user
  // 2026-10-19): the card is laid as they close, so when they last closed is kept too
  const [result, setResult] = useState<RollResult & { at: number }>();
  const [settingsClosedAt, setSettingsClosedAt] = useState(0);
  const closeSettings = useCallback(() => {
    _closeSettings();
    setSettingsClosedAt(Date.now());
  }, [_closeSettings]);
  // the last roll whose card bloomed, or the roll already over when the page opened; the
  // latest roll is in the air until it is this one, and meanwhile the menu is locked and the
  // log withholds it. Derived, not set from an effect, so the log withholds a roll in the
  // very render its message arrives in rather than one render later.
  const [bloomed, setBloomed] = useState<string>();
  const flying = latest && latest._id !== bloomed ? latest._id : undefined;
  // the roll whose card is up, from its bloom (once the dice have settled; `at` is then) until
  // a click on it, the menu opening or the clear timer takes it off this table; and a card
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
      setBloomed(latest?._id);
      return;
    }
    if (latest === null || shown.current === latest._id) return;
    shown.current = latest._id;
    take(latest.seed, latest.dice.length).then(
      (simulation) => {
        // a simulation that lands after a newer roll has replaced this one is left unplayed
        if (shown.current !== latest._id) return;
        setResult({
          at: Date.now(),
          id: latest._id,
          simulation,
          dice: rolledOf(latest.dice, latest.faces),
          author: latest.author,
        });
      },
      // the page closed while it was waiting
      () => undefined,
    );
  }, [latest]);

  // takes the arrived card's roll off this table, for a click on it, the menu and the timer
  // alike
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

  const onArrive = useCallback(
    (id: string) => {
      setArrived({ id, at: Date.now() });
      setBloomed(id);
      // a roll that lands while the log is up has joined the log instead: its card wilts
      // unseen, rather than waiting under the log to show once it closes
      if (log !== "closed") setDismissed(id);
    },
    [log],
  );
  // withheld while the settings card is up over this corner, and laid as it closes with
  // whatever wait is left (the notification reads the wait once, as it lays the card)
  const announced = useMemo(
    () =>
      settingsOpen || !result
        ? undefined
        : {
            id: result.id,
            author: result.author,
            dice: result.dice.map(({ colour }) => colour),
            totals: score(result.dice),
            // once the faces have settled and faded (wall-clock; a stalled tab's playback is
            // clamped and may land a little after), less the time the settings held it back
            delaySeconds: Math.max(
              0,
              secondsAt(result.simulation.frameCount) +
                FADE_SECONDS -
                Math.max(0, settingsClosedAt - result.at) / 1000,
            ),
            clearSeconds,
          },
    [settingsOpen, result, settingsClosedAt, clearSeconds],
  );
  const onRoll = useCallback(
    (dice: DieColour[]) => {
      if (!campaign) return;
      // the roll comes back through the subscription; a seed another player's roll has just
      // replaced is declined, and their roll plays instead
      roll({ campaignId: campaign._id, seed: campaign.rollSeed, dice }).catch((error: unknown) => {
        if (!(error instanceof ConvexError && error.data.code === "SEED_CONFLICT")) throw error;
      });
    },
    [campaign, roll],
  );
  const openLog = useCallback(() => setLog("open"), []);

  return (
    <Page>
      <Canvas flat shadows="soft" dpr={DPR} gl={GL} camera={CAMERA}>
        <DiceScene result={result} seed={campaign?.rollSeed} />
      </Canvas>
      <Overlay>
        {latest === null ? <Hint element="div" text="Choose your dice, then roll" /> : <div />}
        {/* the roll on the table: a newer roll's card is laid over it once that roll has
            played; a click on the card takes the roll off this table alone (`shown` still
            holds its id, so the subscription does not play it again) */}
        <RollNotification
          isOpen={result !== undefined}
          concealed={log !== "closed"}
          dismissed={dismissed}
          onArrive={onArrive}
          onDismiss={dismiss}
          roll={announced}
        />
        <RollLog phase={log} onPhase={setLog} campaignId={campaignId} pending={flying} />
        <Menu
          disabled={!campaign}
          locked={flying !== undefined}
          onRoll={onRoll}
          onLog={openLog}
          onSettings={openSettings}
          // the card over the button's spot goes as the menu opens round it
          onOpen={dismiss}
        />
        <DiceSettings isOpen={settingsOpen} requestClose={closeSettings} />
      </Overlay>
    </Page>
  );
};

export default DiceRoller;
