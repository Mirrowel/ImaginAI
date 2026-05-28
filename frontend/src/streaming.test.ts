import { describe, expect, it } from "vitest";
import { parseSseFrames } from "./streaming";

describe("parseSseFrames", () => {
  it("parses complete generation event frames", () => {
    const parsed = parseSseFrames("", 'data: {"type":"generation.status","phase":"building_context","message":"Building"}\n\n');

    expect(parsed.remainder).toBe("");
    expect(parsed.events).toEqual([{ type: "generation.status", phase: "building_context", message: "Building" }]);
  });

  it("keeps incomplete frame text for the next stream chunk", () => {
    const first = parseSseFrames("", 'data: {"type":"generation.content_delta","text":"Rain');
    const second = parseSseFrames(first.remainder, ' falls"}\n\n');

    expect(first.events).toEqual([]);
    expect(second.events).toEqual([{ type: "generation.content_delta", text: "Rain falls" }]);
  });
});
