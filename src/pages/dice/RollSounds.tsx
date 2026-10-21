import { useFrame } from "@react-three/fiber";
import prefersReducedMotion from "lib/prefersReducedMotion.ts";
import { MAX_DELTA, type RollResult, secondsAt } from "pages/dice/dice.ts";
import { load, play } from "pages/dice/sounds.ts";
import { useEffect, useRef, useState } from "react";

// Plays the roll's recorded impacts as the dice play, on the clock Die.tsx moves them to
// (the same clamped delta, MAX_DELTA). Nothing under reduced
// motion: the dice jump to rest, so there is nothing to sound.
const RollSounds = ({ result }: { result?: RollResult }) => {
  // the roll being sounded, how far into it the playback is, and the next impact due
  const playing = useRef({ id: "", elapsed: 0, next: 0 });
  const [reduced] = useState(prefersReducedMotion);
  // the samples are fetched for the dice page alone, ahead of its first roll
  useEffect(() => void load(), []);

  useFrame((_, delta) => {
    if (!result || reduced) return;
    if (playing.current.id !== result.id) playing.current = { id: result.id, elapsed: 0, next: 0 };
    const current = playing.current;
    current.elapsed += Math.min(delta, MAX_DELTA);
    const due = result.simulation.contacts
      .slice(current.next)
      .filter(({ frame }) => secondsAt(frame) <= current.elapsed);
    due.forEach(play);
    current.next += due.length;
  });

  return null;
};

export default RollSounds;
