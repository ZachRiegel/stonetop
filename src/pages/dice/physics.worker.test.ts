// @vitest-environment node
import {
  drawFaces,
  FACE_NORMALS,
  FRAME_RATE,
  FRAME_STRIDE,
  MAX_SECONDS,
  mulberry32,
  type SimulateRequest,
  type Simulation,
} from "pages/dice/dice.ts";
import { Quaternion, Vector3 } from "three";
import { describe, expect, test, vi } from "vitest";

// the worker talks through the global message channel; here it is wired up by hand
const listeners: ((event: { data: SimulateRequest }) => Promise<void>)[] = [];
const replies: Simulation[] = [];
vi.stubGlobal("addEventListener", (_type: string, listener: (typeof listeners)[number]) =>
  listeners.push(listener),
);
vi.stubGlobal("postMessage", (reply: Simulation) => replies.push(reply));
await import("pages/dice/physics.worker.ts");

const ARENA = { width: 24, height: 12 };
const simulate = async (request: Omit<SimulateRequest, "version">) => {
  replies.length = 0;
  await listeners[0]?.({ data: { ...request, version: 3 } });
  const reply = replies[0];
  if (!reply) throw new Error("no reply");
  return reply;
};

// one die's pose in one frame
const poseAt = ({ frames, count }: Simulation, frame: number, die: number) => {
  const at = (frame * count + die) * FRAME_STRIDE;
  const [x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1] = frames.subarray(at, at + 7);
  return { position: new Vector3(x, y, z), rotation: new Quaternion(qx, qy, qz, qw) };
};

describe("physics worker", () => {
  test("throws the same roll frame for frame from the same seed and arena", async () => {
    const first = await simulate({ count: 3, seed: 42, arena: ARENA });
    const second = await simulate({ count: 3, seed: 42, arena: ARENA });
    expect(second).toEqual(first);
    expect(first.version).toBe(3);
    expect(first.frames).toHaveLength(first.frameCount * 3 * FRAME_STRIDE);
  });

  test("decides the faces from the seed alone, before the throw", async () => {
    const wide = await simulate({ count: 4, seed: 42, arena: ARENA });
    const tall = await simulate({ count: 4, seed: 42, arena: { width: 12, height: 24 } });
    expect(wide.faces).toEqual(drawFaces(mulberry32(42), 4));
    expect(tall.faces).toEqual(wide.faces);
    expect(tall.frames).not.toEqual(wide.frames);
  });

  test.each([1, 2, 3, 4, 5])(
    "leaves %i dice flat, on screen, with the landed face up",
    async (count) => {
      const seeds = [1, 2, 3, 4, 5, 6];
      const simulations = await Promise.all(
        seeds.map((seed) => simulate({ count, seed, arena: ARENA })),
      );
      simulations.forEach((simulation) => {
        expect(simulation.frameCount).toBeGreaterThan(1);
        expect(simulation.frameCount).toBeLessThanOrEqual(MAX_SECONDS * FRAME_RATE);
        expect(simulation.landed).toHaveLength(count);
        Array.from({ length: count }, (_, die) => die).forEach((die) => {
          const { position, rotation } = poseAt(simulation, simulation.frameCount - 1, die);
          expect(Math.abs(position.x)).toBeLessThan(ARENA.width / 2);
          expect(Math.abs(position.y)).toBeLessThan(ARENA.height / 2);
          // resting on the floor: the centre of a unit cube sits half a die up
          expect(position.z).toBeCloseTo(0.5, 1);
          const landed = simulation.landed[die];
          if (landed === undefined) throw new Error("no landed face");
          const up = new Vector3(...FACE_NORMALS[landed]).applyQuaternion(rotation).z;
          expect(up).toBeGreaterThan(0.98);
        });
      });
    },
  );
});
