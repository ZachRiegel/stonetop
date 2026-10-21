// The dice sounds: a wooden knock for a die on the table and a lighter tap for dice on each
// other, each one of five takes at random, and the setting that silences them on this
// device. Web Audio only; RollSounds.tsx fires them as a roll plays. The samples are Kenney's
// CC0 Impact Sounds (kenney.nl/assets/impact-sounds), impactWood_heavy_000 to 004 and
// impactWood_medium_000 to 004, chosen by the user after auditioning the packs and mixed down
// to mono WAV since Safari cannot decode the Ogg Vorbis they ship as.
import type { Contact } from "pages/dice/dice.ts";
import { preference } from "pages/dice/preferences.ts";

// the loudest an impact plays; the user brought it down twice by ear (0.7, then 0.7 of that)
const VOLUME = 0.49;
// the takes' URLs; their order is of no account, as each impact picks one at random
const URLS: Record<Contact["kind"], string[]> = {
  table: Object.values(
    import.meta.glob<string>("/src/assets/diceKnock*.wav", { eager: true, import: "default" }),
  ),
  dice: Object.values(
    import.meta.glob<string>("/src/assets/diceClack*.wav", { eager: true, import: "default" }),
  ),
};
// a device preference (preferences.ts); only "off" is stored
const store = preference("dice-sounds");
export const isEnabled = () => store.get() !== "off";
export const subscribe = store.subscribe;
export const setEnabled = (on: boolean) => store.set(on ? null : "off");

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
  if (!isEnabled() || !decoded) return;
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
