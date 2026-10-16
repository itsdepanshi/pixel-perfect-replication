import { describe, expect, it } from "vitest";
import { createSnake, stepSnake, turn } from "./snake-logic";
import { breachKey, breachTick, startBreach, makeChallenge } from "./breach-logic";
import { generateLevel, isSolvable, moveMaze, startMaze, passable } from "./maze-logic";
import { createRng } from "./random";
import { executeCommand, SECRET_COMMAND } from "../terminal-commands";

describe("snake", () => {
  it("moves, ignores reversals and grows on food", () => {
    let s = createSnake("classic", 1);
    s = turn(s, "left");
    expect(s.queue).toEqual([]);
    s = { ...s, food: { x: 7, y: s.snake[0].y } };
    s = stepSnake(s);
    expect(s.snake[0]).toEqual({ x: 7, y: 8 });
    expect(s.snake.length).toBe(4);
    expect(s.score).toBe(1);
  });
  it("dies on walls and own body, but phase passes through body", () => {
    let s = createSnake("classic", 2);
    for (let i = 0; i < 30 && s.alive; i++) s = stepSnake({ ...s, food: { x: 0, y: 0 } });
    expect(s.alive).toBe(false);
    const body = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }];
    const loop = { ...createSnake("chaos", 3), snake: body, dir: "down" as const, food: { x: 20, y: 1 } };
    expect(stepSnake(loop).alive).toBe(false);
    expect(stepSnake({ ...loop, active: { dash: 0, phase: 5 } }).alive).toBe(true);
  });
  it("daily mode is deterministic", () => {
    expect(createSnake("daily", 20261016)).toEqual(createSnake("daily", 20261016));
  });
});

describe("breach", () => {
  it("validates characters, penalises errors and times out", () => {
    let g = startBreach("levels", "normal", 5);
    const answer = g.challenge.answer;
    const wrong = breachKey(g, "~");
    expect(wrong.combo).toBe(0);
    expect(wrong.timeLeft).toBeLessThan(g.timeLeft);
    for (const ch of answer) g = breachKey(g, ch);
    expect(g.combo).toBe(1);
    expect(g.index).toBe(1);
    const lives = g.lives;
    g = breachTick(g, 60000);
    expect(g.lives).toBe(lives - 1);
  });
  it("decoys are rejected with Enter", () => {
    const r = createRng(1);
    let c = makeChallenge(5, r);
    while (c.kind !== "decoy") c = makeChallenge(5, r);
    const g = { ...startBreach("endless", "normal", 1), challenge: c };
    expect(breachKey(g, "Enter").decoys).toBe(1);
    expect(breachKey(g, "a").combo).toBe(0);
  });
});

describe("zero day", () => {
  it("every generated level is solvable", () => {
    for (let level = 1; level <= 8; level++) for (let seed = 0; seed < 40; seed++) expect(isSolvable(generateLevel(level, seed * 13 + level))).toBe(true);
  });
  it("gate requires the key and walls block movement", () => {
    const run = startMaze("campaign", "normal", 1);
    expect(passable(run.L, run.L.gate, false, false)).toBe(false);
    expect(passable(run.L, run.L.gate, false, true)).toBe(true);
    const blocked = moveMaze(run, "up");
    expect(blocked.pos).toEqual(run.pos);
  });
});

it("secret command is harmless text", () => {
  expect(executeCommand(SECRET_COMMAND).join(" ")).toContain("Secret unlocked");
});
