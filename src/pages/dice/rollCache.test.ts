// @vitest-environment node
import type { SimulateRequest, Simulation } from "pages/dice/dice.ts";
import { beforeEach, describe, expect, test, vi } from "vitest";

// stands in for the physics worker: records what it is asked for, replies on demand
class FakeWorker {
  static all: FakeWorker[] = [];
  posted: SimulateRequest[] = [];
  terminated = false;
  onmessage: ((event: { data: Simulation }) => void) | null = null;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(request: SimulateRequest) {
    this.posted.push(request);
  }
  terminate() {
    this.terminated = true;
  }
  reply(seed: number, count: number, version: number) {
    const simulation: Simulation = {
      seed,
      count,
      version,
      attempts: 1,
      faces: [],
      landed: [],
      frameCount: 0,
      frames: new Float32Array(),
    };
    this.onmessage?.({ data: simulation });
    return simulation;
  }
}

const WIDE = { width: 20, height: 10 };
const TALL = { width: 10, height: 20 };
const asked = (worker: FakeWorker) =>
  worker.posted.map(({ seed, count, version }) => `${seed}:${count}@${version}`);
// whether a promise has settled by the end of this tick
const settled = (promise: Promise<unknown>) =>
  Promise.race([
    promise.then(
      () => true,
      () => true,
    ),
    Promise.resolve(false),
  ]);

// the cache is a module singleton, so every test gets a fresh copy
const load = async () => {
  vi.resetModules();
  FakeWorker.all = [];
  vi.stubGlobal("Worker", FakeWorker);
  const cache = await import("pages/dice/rollCache.ts");
  return { ...cache, worker: () => FakeWorker.all[0] };
};

describe("rollCache", () => {
  beforeEach(() => vi.unstubAllGlobals());

  test("simulates the seed's roll for every pool size, once", async () => {
    const { configure, worker } = await load();
    configure({}, WIDE, 7);
    expect(asked(worker()!)).toEqual(["7:1@1", "7:2@1", "7:3@1", "7:4@1", "7:5@1"]);
    expect(worker()!.posted[0]?.arena).toEqual(WIDE);
    configure({}, WIDE, 7);
    expect(worker()!.posted).toHaveLength(5);
    expect(FakeWorker.all).toHaveLength(1);
  });

  test("hands a ready simulation over once, then simulates that size again on demand", async () => {
    const { configure, take, worker } = await load();
    configure({}, WIDE, 7);
    const simulation = worker()!.reply(7, 2, 1);
    await expect(take(7, 2)).resolves.toBe(simulation);
    expect(worker()!.posted).toHaveLength(5);
    const again = take(7, 2);
    expect(asked(worker()!).at(-1)).toBe("7:2@1");
    expect(await settled(again)).toBe(false);
    worker()!.reply(7, 2, 1);
    await expect(again).resolves.toMatchObject({ seed: 7, count: 2 });
  });

  test("serves a roll taken before its simulation was ready", async () => {
    const { configure, take, worker } = await load();
    configure({}, WIDE, 7);
    const pending = take(7, 3);
    expect(await settled(pending)).toBe(false);
    worker()!.reply(7, 3, 1);
    await expect(pending).resolves.toMatchObject({ seed: 7, count: 3 });
    // handed over: the next take of the same roll is a new request
    take(7, 3);
    expect(asked(worker()!).at(-1)).toBe("7:3@1");
  });

  test("simulates a roll the cache never prepared, even before the scene is set up", async () => {
    const { configure, take, worker } = await load();
    const pending = take(99, 1);
    expect(worker()).toBeUndefined();
    configure({}, WIDE, 7);
    expect(asked(worker()!)).toContain("99:1@1");
    worker()!.reply(99, 1, 1);
    await expect(pending).resolves.toMatchObject({ seed: 99, count: 1 });
  });

  test("simulates again for a new arena, dropping what the old one produced", async () => {
    const { configure, take, worker } = await load();
    configure({}, WIDE, 7);
    worker()!.reply(7, 1, 1);
    const pending = take(7, 2);
    configure({}, TALL, 7);
    expect(asked(worker()!).slice(5)).toEqual(["7:2@2", "7:1@2", "7:3@2", "7:4@2", "7:5@2"]);
    expect(worker()!.posted.at(-1)?.arena).toEqual(TALL);
    // the old arena's simulations no longer count, late or early
    worker()!.reply(7, 2, 1);
    expect(await settled(pending)).toBe(false);
    const ready = take(7, 1);
    expect(await settled(ready)).toBe(false);
    worker()!.reply(7, 2, 2);
    worker()!.reply(7, 1, 2);
    await expect(pending).resolves.toMatchObject({ count: 2, version: 2 });
    await expect(ready).resolves.toMatchObject({ count: 1, version: 2 });
  });

  test("moves on to a new seed without dropping a roll in waiting", async () => {
    const { configure, take, worker } = await load();
    configure({}, WIDE, 7);
    worker()!.reply(7, 1, 1);
    const pending = take(7, 5);
    configure({}, WIDE, 8);
    expect(asked(worker()!).slice(5)).toEqual(["8:1@1", "8:2@1", "8:3@1", "8:4@1", "8:5@1"]);
    worker()!.reply(7, 5, 1);
    await expect(pending).resolves.toMatchObject({ seed: 7, count: 5 });
    // the old seed's untaken rolls are gone
    take(7, 1);
    expect(asked(worker()!).at(-1)).toBe("7:1@1");
  });

  test("shuts down for its owner only, failing any roll in waiting", async () => {
    const { configure, release, take, worker } = await load();
    const owner = {};
    configure(owner, WIDE, 7);
    const pending = take(7, 1);
    release({});
    expect(worker()!.terminated).toBe(false);
    release(owner);
    expect(worker()!.terminated).toBe(true);
    await expect(pending).rejects.toThrow("closed");
    // a later scene starts afresh
    configure({}, WIDE, 7);
    expect(FakeWorker.all).toHaveLength(2);
  });
});
