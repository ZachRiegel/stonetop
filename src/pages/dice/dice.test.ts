// @vitest-environment node
import { DICE, drawFaces, mulberry32, newSeed, score } from "pages/dice/dice.ts";
import { describe, expect, test } from "vitest";

describe("drawFaces", () => {
  test("draws one face per die, the same every time for the same seed", () => {
    const faces = drawFaces(mulberry32(1234), 5);
    expect(faces).toHaveLength(5);
    faces.forEach((face) => expect([0, 1, 2, 3, 4, 5]).toContain(face));
    expect(drawFaces(mulberry32(1234), 5)).toEqual(faces);
    // a shorter roll of the same seed shows the same first faces
    expect(drawFaces(mulberry32(1234), 2)).toEqual(faces.slice(0, 2));
  });

  test("differs between seeds", () => {
    const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
    const rolls = seeds.map((seed) => drawFaces(mulberry32(seed), 5).join(""));
    expect(new Set(rolls).size).toBeGreaterThan(15);
  });
});

describe("score", () => {
  test("totals the symbols of each die's face", () => {
    expect(DICE.blue.faces[5]).toEqual({ burst: 2, special: 0, skull: 0 });
    expect(DICE.orange.faces[2]).toEqual({ burst: 1, special: 1, skull: 0 });
    expect(DICE.violet.faces[0]).toEqual({ burst: 0, special: 0, skull: 1 });
    expect(
      score([
        { colour: "blue", face: 5 },
        { colour: "orange", face: 2 },
        { colour: "violet", face: 0 },
      ]),
    ).toEqual({ burst: 3, special: 1, skull: 1 });
    expect(score([])).toEqual({ burst: 0, special: 0, skull: 0 });
  });
});

describe("newSeed", () => {
  test("is a 32-bit unsigned integer", () => {
    const seed = newSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});
