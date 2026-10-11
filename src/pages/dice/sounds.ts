// The dice sounds: a wooden knock for a die on the table and a lighter tap for dice on each
// other, each one of five takes at random, and the setting that silences them on this
// device. Web Audio only; RollSounds.tsx fires them as a roll plays. The samples are Kenney's
// CC0 Impact Sounds (kenney.nl/assets/impact-sounds), impactWood_heavy_000 to 004 and
// impactWood_medium_000 to 004, chosen by the user after auditioning the packs and mixed down
// to mono WAV since Safari cannot decode the Ogg Vorbis they ship as.
import clack0 from "assets/diceClack0.wav";
import clack1 from "assets/diceClack1.wav";
import clack2 from "assets/diceClack2.wav";
import clack3 from "assets/diceClack3.wav";
import clack4 from "assets/diceClack4.wav";
import knock0 from "assets/diceKnock0.wav";
import knock1 from "assets/diceKnock1.wav";
import knock2 from "assets/diceKnock2.wav";
import knock3 from "assets/diceKnock3.wav";
import knock4 from "assets/diceKnock4.wav";
import type { Contact } from "pages/dice/dice.ts";

// the loudest an impact plays; the user brought it down twice by ear (0.7, then 0.7 of that)
const VOLUME = 0.49;
const URLS: Record<Contact["kind"], string[]> = {
  table: [knock0, knock1, knock2, knock3, knock4],
  dice: [clack0, clack1, clack2, clack3, clack4],
};
// a device preference, so storage here rather than a field on the user: only "off" is
// stored, and storage that throws (a private window) makes the choice last the session
const STORAGE_KEY = "dice-sounds";

const stored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};
let enabled = stored();
const listeners = new Set<() => void>();
export const isEnabled = () => enabled;
// for useSyncExternalStore
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const setEnabled = (on: boolean) => {
  enabled = on;
  try {
    if (on) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // the choice lasts the session
  }
  listeners.forEach((listener) => listener());
};

// one context, made on first use
let context: AudioContext | undefined;
const contextOf = () => (context ??= new AudioContext());

// The samples, fetched and decoded once something asks (the dice scene, on mount, so no
// other page pays for them). `decoded` is set once they are, and an impact before then is
// dropped rather than played late in a burst.
let decoded: Record<Contact["kind"], AudioBuffer[]> | undefined;
let loading: Promise<void> | undefined;
export const load = () => {
  const decode = (urls: string[]) =>
    Promise.all(
      urls.map(async (url) => contextOf().decodeAudioData(await (await fetch(url)).arrayBuffer())),
    );
  loading ??= Promise.all([decode(URLS.table), decode(URLS.dice)]).then(([table, dice]) => {
    decoded = { table, dice };
  });
  return loading;
};

// Starts the audio; call it from a user gesture. Safari only starts a context from inside
// one, and Chrome only one made after the page has been clicked. Until some gesture,
// another player's roll plays silently.
const resume = () => contextOf().resume();
// starts the audio on the first press or key anywhere in the app (RootLayout.tsx runs
// this), usually long before the dice page; returns the cleanup, as an effect wants it
export const unlockOnGesture = () => {
  const events = ["pointerdown", "keydown"] as const;
  const once = () => {
    void resume();
    events.forEach((event) => window.removeEventListener(event, once));
  };
  events.forEach((event) => window.addEventListener(event, once));
  return () => events.forEach((event) => window.removeEventListener(event, once));
};
// started and with the samples decoded, from a gesture: what a preview needs
export const unlock = async () => {
  await Promise.all([resume(), load()]);
};

// plays one impact: a take of its kind at random, louder the harder it hit, its pitch
// jittered a little on top so a clatter never repeats itself (audio only; nothing
// deterministic reads it)
export const play = ({ kind, strength }: Pick<Contact, "kind" | "strength">) => {
  if (!enabled || !decoded) return;
  const context = contextOf();
  if (context.state !== "running") return;
  const takes = decoded[kind];
  const source = new AudioBufferSourceNode(context, {
    buffer: takes[Math.floor(Math.random() * takes.length)],
    playbackRate: 0.92 + Math.random() * 0.16,
  });
  source
    .connect(new GainNode(context, { gain: VOLUME * (0.25 + 0.75 * strength) }))
    .connect(context.destination);
  source.start();
};
