// Pre-simulated rolls for the campaign's next seed, one for every pool size, so a roll
// only has to play frames when it lands. The throw depends on the arena (the visible
// canvas), so an arena change simulates everything again.
import { type Arena, MAX_POOL, type SimulateRequest, type Simulation } from "pages/dice/dice.ts";

// whoever configured the cache last; a scene only tears down what it set up itself, as
// the previous scene's unmount can land after the next scene has already mounted
export type Owner = object;
type Store = { owner: Owner; worker: Worker; arena: Arena; version: number };
type Entry = {
  seed: number;
  count: number;
  promise: Promise<Simulation>;
  resolve: (simulation: Simulation) => void;
  reject: (reason: Error) => void;
  // the worker has replied
  ready: boolean;
  // a roll is waiting on it, and is owed the simulation whatever happens to the cache
  taken: boolean;
};

const COUNTS = Array.from({ length: MAX_POOL }, (_, i) => i + 1);
const keyOf = (seed: number, count: number) => `${seed}:${count}`;

let store: Store | undefined;
// every simulation asked for and not yet handed over
const entries = new Map<string, Entry>();

const post = (current: Store, { seed, count }: Entry) =>
  current.worker.postMessage({
    count,
    seed,
    arena: current.arena,
    version: current.version,
  } satisfies SimulateRequest);

// the entry for this roll, requested now if it is new (or once the cache is configured)
const entryOf = (seed: number, count: number): Entry => {
  const existing = entries.get(keyOf(seed, count));
  if (existing) return existing;
  const entry = { seed, count, ...Promise.withResolvers<Simulation>(), ready: false, taken: false };
  entries.set(keyOf(seed, count), entry);
  if (store) post(store, entry);
  return entry;
};

const receive = (simulation: Simulation) => {
  const key = keyOf(simulation.seed, simulation.count);
  const entry = entries.get(key);
  // a reply simulated for an earlier arena is thrown away: it was asked for again
  if (!entry || simulation.version !== store?.version) return;
  if (entry.taken) entries.delete(key);
  else entries.set(key, { ...entry, ready: true });
  entry.resolve(simulation);
};

// Prepares the seed's rolls in this arena. An arena change drops whatever was simulated
// for the old one, except rolls in waiting, which are simulated again; a seed change
// drops the old seed's untaken rolls.
export const configure = (owner: Owner, arena: Arena, seed?: number) => {
  const previous = store;
  const sameArena =
    previous?.arena.width === arena.width && previous?.arena.height === arena.height;
  const next: Store = {
    owner,
    arena,
    worker:
      previous?.worker ??
      Object.assign(
        new Worker(new URL("./physics.worker.ts", import.meta.url), { type: "module" }),
        {
          onmessage: ({ data }: MessageEvent<Simulation>) => receive(data),
        },
      ),
    version: (previous?.version ?? 0) + (sameArena ? 0 : 1),
  };
  store = next;
  [...entries]
    .filter(([, entry]) => !entry.taken && (!sameArena || entry.seed !== seed))
    .forEach(([key]) => entries.delete(key));
  if (!sameArena) entries.forEach((entry) => post(next, entry));
  if (seed !== undefined) COUNTS.forEach((count) => entryOf(seed, count));
};

// Shuts the worker down, unless another scene has taken the cache over since.
export const release = (owner: Owner) => {
  if (store?.owner !== owner) return;
  store.worker.terminate();
  store = undefined;
  [...entries.values()]
    .filter((entry) => entry.taken)
    .forEach(({ reject }) => reject(new Error("the dice page closed")));
  entries.clear();
};

// The simulation of this roll; one the cache never prepared (a stale cache, or a page
// opened mid-roll) is simulated on demand.
export const take = (seed: number, count: number) => {
  const entry = entryOf(seed, count);
  if (entry.ready) entries.delete(keyOf(seed, count));
  else entries.set(keyOf(seed, count), { ...entry, taken: true });
  return entry.promise;
};
