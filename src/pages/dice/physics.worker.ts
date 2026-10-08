// Rolls the dice for real, off the main thread. One seed decides everything: first the
// faces the roll will show, then the throw. The page plays the recorded frames back and
// turns each die's art onto whichever face the physics left on top.
import RAPIER, {
  type ColliderDesc,
  type PhysicsHooks,
  type RigidBody,
  type Rotation,
} from "@dimforge/rapier3d-deterministic-compat";

import {
  type Arena,
  CEILING,
  drawFaces,
  FACE_NORMALS,
  type FaceIndex,
  FRAME_RATE,
  FRAME_STRIDE,
  MAX_SECONDS,
  mulberry32,
  type SimulateRequest,
  type Simulation,
} from "./dice.ts"; // relative: the worker is bundled apart from the app, without the src/ path mapping

// How the throw feels, in die units (the die is a unit cube). The walls and the pull to
// the middle are kept subtle so a roll looks natural; the throw is sized to run out of
// speed around the centre.
const FEEL = {
  gravity: 30,
  wallRestitution: 0.7,
  floorRestitution: 0.55,
  floorFriction: 0.7,
  dieFriction: 0.6,
  dieRestitution: 0.5,
  // the throw flies almost freely until the die's first wall bounce, then the heavy
  // damping takes over so it runs out of speed around the middle
  linearDamping: 0.1,
  settleDamping: 4,
  // how long after the bounce the damping takes to ramp from the throw value to the
  // settle value, so the wall does not read as sticky
  settleRampSeconds: 0.3,
  angularDamping: 0.6,
  // a pull towards the middle of the screen, far below what friction holds at rest
  spring: 0.8,
  throwSpeed: 90,
  // standard deviations of the throw's randomness (normally distributed)
  throwSpeedSpread: 7,
  // how far past the corner the first die waits, and the gap to each next one
  throwStart: 1,
  throwSpacing: 1.3,
  spin: 7,
  // the throw heads for the aim, give or take this much (radians, one sigma)
  throwAngleSpread: 0.18,
};
export type Feel = typeof FEEL;
// how flat a die must land (cosine of the top face's lean) to count
const FLAT = 0.98;
// how far inside every wall a die's centre must stay for the throw to count: less than
// half a die, since a fast hit may sink into a wall a little before it is pushed back
const MARGIN = 0.3;
const MAX_TRIES = 8;
// a one-way wall stays open until the die is this far inside, i.e. clear of the wall's
// slab: closing it any sooner would push the die (and count as its first bounce)
const CLEARANCE = 0.9;
// how deep the one-way walls are: a die that tunnels into one at speed is still nearer
// the inner face, so it is pushed back into the arena rather than out
const GATE_DEPTH = 6;
// the floor, ceiling and side walls extend this far past the arena so the off-screen
// throw start is boxed in too
const APRON = 12;
const MAX_FRAMES = MAX_SECONDS * FRAME_RATE;
const FACE_INDICES: FaceIndex[] = [0, 1, 2, 3, 4, 5];

const ready = RAPIER.init();

type Position = { x: number; y: number };

// a normally distributed offset with the given standard deviation (Box–Muller), clipped
// at three sigma so no seed produces a freak throw
const spread = (random: () => number, sigma: number) => {
  const u = 1 - random();
  const v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(3, Math.max(-3, z)) * sigma;
};

// a uniformly random orientation (Shoemake's method)
const randomRotation = (random: () => number): Rotation => {
  const u = random();
  const a = 2 * Math.PI * random();
  const b = 2 * Math.PI * random();
  return {
    x: Math.sqrt(1 - u) * Math.sin(a),
    y: Math.sqrt(1 - u) * Math.cos(a),
    z: Math.sqrt(u) * Math.sin(b),
    w: Math.sqrt(u) * Math.cos(b),
  };
};

// the world z of a local direction under a rotation (the last row of its matrix)
const upwardness = ({ x, y, z, w }: Rotation, [nx, ny, nz]: readonly [number, number, number]) =>
  2 * (x * z - w * y) * nx + 2 * (y * z + w * x) * ny + (1 - 2 * (x * x + y * y)) * nz;

const landedFace = (body: RigidBody) => {
  const rotation = body.rotation();
  return FACE_INDICES.map((face) => ({
    face,
    up: upwardness(rotation, FACE_NORMALS[face]),
  })).reduce((best, candidate) => (candidate.up > best.up ? candidate : best));
};

const attempt = (count: number, seed: number, { width, height }: Arena, feel: Feel) => {
  const random = mulberry32(seed);
  const faces = drawFaces(random, count);
  const half = { x: width / 2, y: height / 2 };
  const world = new RAPIER.World({ x: 0, y: 0, z: -feel.gravity });
  world.timestep = 1 / FRAME_RATE;

  const fixture = (desc: ColliderDesc, restitution: number, friction: number) =>
    world.createCollider(
      desc
        .setRestitution(restitution)
        // the fixture's bounce wins over the die's, whichever way it differs
        .setRestitutionCombineRule(
          restitution >= feel.dieRestitution
            ? RAPIER.CoefficientCombineRule.Max
            : RAPIER.CoefficientCombineRule.Min,
        )
        .setFriction(friction),
    );
  // floor (its top is z = 0) and ceiling
  fixture(
    RAPIER.ColliderDesc.cuboid(half.x + APRON, half.y + APRON, 1).setTranslation(0, 0, -1),
    feel.floorRestitution,
    feel.floorFriction,
  );
  fixture(
    RAPIER.ColliderDesc.cuboid(half.x + APRON, half.y + APRON, 1).setTranslation(0, 0, CEILING + 1),
    0.2,
    0.5,
  );
  // the walls report their collisions: a die's first bounce off any of them switches
  // its damping (passing through a one-way wall is no collision, so it does not count)
  const walls = new Set<number>();
  const wall = (desc: ColliderDesc) =>
    fixture(desc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), feel.wallRestitution, 0.5);
  // left and top walls, inner faces on the arena's edges
  walls.add(
    wall(
      RAPIER.ColliderDesc.cuboid(1, half.y + APRON, CEILING).setTranslation(
        -half.x - 1,
        0,
        CEILING / 2,
      ),
    ).handle,
  );
  walls.add(
    wall(
      RAPIER.ColliderDesc.cuboid(half.x + APRON, 1, CEILING).setTranslation(
        0,
        half.y + 1,
        CEILING / 2,
      ),
    ).handle,
  );
  // the right and bottom walls are one-way: the dice are thrown in from past the
  // bottom-right corner and pass through them, and each wall turns solid for a die once
  // that die has been clear of it on the inside
  const gate = (desc: ColliderDesc, isInside: (position: Position) => boolean) => {
    const handle = wall(desc.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS)).handle;
    walls.add(handle);
    return [handle, { isInside, closedFor: new Set<number>() }] as const;
  };
  const gates = new Map([
    gate(
      RAPIER.ColliderDesc.cuboid(GATE_DEPTH / 2, half.y + APRON, CEILING).setTranslation(
        half.x + GATE_DEPTH / 2,
        0,
        CEILING / 2,
      ),
      ({ x }) => x < half.x - CLEARANCE,
    ),
    gate(
      RAPIER.ColliderDesc.cuboid(half.x + APRON, GATE_DEPTH / 2, CEILING).setTranslation(
        0,
        -half.y - GATE_DEPTH / 2,
        CEILING / 2,
      ),
      ({ y }) => y > -half.y + CLEARANCE,
    ),
  ]);
  // the hooks only reach the solver when an event queue is passed along with them, and
  // they must not call back into Rapier (that leaves a borrow dangling and the world can
  // never be freed), so they read the gate state noted down before each step
  const events = new RAPIER.EventQueue(true);
  const hooks: PhysicsHooks = {
    filterContactPair: (collider1, collider2, body1, body2) => {
      const [state, die] = gates.has(collider1)
        ? [gates.get(collider1), body2]
        : [gates.get(collider2), body1];
      return !state || die == null || state.closedFor.has(die)
        ? RAPIER.SolverFlags.COMPUTE_IMPULSE
        : null;
    },
    filterIntersectionPair: () => true,
  };

  // the dice wait in a line past the bottom-right corner, spread out across the throw,
  // then fly in spinning towards the middle
  const dice = faces.map((_, i) => {
    const along = feel.throwStart + i * feel.throwSpacing;
    const across = spread(random, half.y * 0.3);
    // aimed from the corner at the middle of the screen, whatever its shape
    const heading = Math.atan2(half.y, -half.x) + spread(random, feel.throwAngleSpread);
    const speed = feel.throwSpeed + spread(random, feel.throwSpeedSpread);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(
          half.x + (along + across) * Math.SQRT1_2,
          -half.y - (along - across) * Math.SQRT1_2,
          1 + random() * (CEILING - 2),
        )
        .setRotation(randomRotation(random))
        .setLinvel(speed * Math.cos(heading), speed * Math.sin(heading), 0)
        .setAngvel({
          x: spread(random, feel.spin),
          y: spread(random, feel.spin),
          z: spread(random, feel.spin),
        })
        .setLinearDamping(feel.linearDamping)
        .setAngularDamping(feel.angularDamping)
        .setCcdEnabled(true),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        .setDensity(1)
        .setFriction(feel.dieFriction)
        .setRestitution(feel.dieRestitution),
      body,
    );
    return { body, collider };
  });
  const dieByCollider = new Map(dice.map(({ body, collider }) => [collider.handle, body]));
  // the frame each die first hit a wall; from then on its damping ramps up to settle
  const bounced = new Map<number, number>();
  // read outside the step, so unlike the hooks this may call into Rapier
  const noteBounces = (frame: number) =>
    events.drainCollisionEvents((handle1, handle2, started) => {
      const die = dieByCollider.get(
        walls.has(handle1) ? handle2 : walls.has(handle2) ? handle1 : -1,
      );
      if (started && die && !bounced.has(die.handle)) bounced.set(die.handle, frame);
    });
  const rampFrames = Math.max(1, feel.settleRampSeconds * FRAME_RATE);
  const settleAfterBounce = (frame: number) =>
    dice.forEach(({ body }) => {
      const since = bounced.get(body.handle);
      if (since === undefined) return;
      const ramp = Math.min(1, (frame - since) / rampFrames);
      body.setLinearDamping(feel.linearDamping + (feel.settleDamping - feel.linearDamping) * ramp);
    });

  const frames = new Float32Array(MAX_FRAMES * count * FRAME_STRIDE);
  const record = (frame: number) =>
    dice.forEach(({ body }, i) => {
      const { x, y, z } = body.translation();
      const q = body.rotation();
      frames.set([x, y, z, q.x, q.y, q.z, q.w], (frame * count + i) * FRAME_STRIDE);
    });
  const prepare = () =>
    dice.forEach(({ body }) => {
      const { x, y } = body.translation();
      gates.forEach(({ isInside, closedFor }) => {
        if (isInside({ x, y })) closedFor.add(body.handle);
      });
      if (body.isSleeping()) return;
      body.resetForces(false);
      body.addForce({ x: -feel.spring * x, y: -feel.spring * y, z: 0 }, false);
    });
  const run = (frame: number): number => {
    if (frame >= MAX_FRAMES || (frame > 0 && dice.every(({ body }) => body.isSleeping())))
      return frame;
    prepare();
    settleAfterBounce(frame);
    world.step(events, hooks);
    noteBounces(frame);
    record(frame);
    return run(frame + 1);
  };
  const frameCount = run(0);

  const landed = dice.map(({ body }) => landedFace(body));
  // never past the solid walls (left, top, floor, ceiling); the gates are checked at rest
  const inside = (x: number, y: number, z: number) =>
    x >= -half.x + MARGIN && y <= half.y - MARGIN && z >= MARGIN && z <= CEILING - MARGIN;
  const stayedIn = Array.from({ length: frameCount * count }, (_, k) => k * FRAME_STRIDE).every(
    (at) => inside(frames[at] ?? 0, frames[at + 1] ?? 0, frames[at + 2] ?? 0),
  );
  const settledIn = dice.every(({ body }) => {
    const { x, y } = body.translation();
    return x <= half.x - MARGIN && y >= -half.y + MARGIN;
  });
  events.free();
  world.free();
  return {
    ok: stayedIn && settledIn && landed.every(({ up }) => up >= FLAT),
    next: Math.floor(random() * 2 ** 32),
    simulation: {
      count,
      faces,
      landed: landed.map(({ face }) => face),
      frameCount,
      frames: frames.slice(0, frameCount * count * FRAME_STRIDE),
    },
  };
};

// A cocked die, or one that ended up off-screen, is thrown again from a seed drawn from
// the same generator, so the whole chain still follows from the seed first asked for
// (the one reported back). The faces stay those of the first throw: the result depends
// on the seed alone, only the throw depends on the arena as well.
const simulate = (
  request: SimulateRequest,
  seed = request.seed,
  tries = MAX_TRIES,
  faces?: FaceIndex[],
): Omit<Simulation, "version"> => {
  const { ok, next, simulation } = attempt(request.count, seed, request.arena, {
    ...FEEL,
    ...request.tuning,
  });
  return ok || tries <= 1
    ? {
        ...simulation,
        faces: faces ?? simulation.faces,
        seed: request.seed,
        attempts: MAX_TRIES - tries + 1,
      }
    : simulate(request, next, tries - 1, faces ?? simulation.faces);
};

addEventListener("message", ({ data }: MessageEvent<SimulateRequest>) =>
  ready
    .then(() => {
      const simulation = simulate(data);
      postMessage({ ...simulation, version: data.version } satisfies Simulation, {
        transfer: [simulation.frames.buffer],
      });
    })
    .catch((error: unknown) => console.error("dice physics failed", error)),
);
