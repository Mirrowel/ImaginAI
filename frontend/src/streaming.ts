import type { GenerationEvent } from "./types";

/** Parsed SSE frame result with remaining incomplete stream buffer. */
export type ParsedSseFrames = {
  events: GenerationEvent[];
  remainder: string;
};

/** Parse text/event-stream chunks emitted by POST generation endpoints. */
export function parseSseFrames(previous: string, chunk: string): ParsedSseFrames {
  const buffer = previous + chunk;
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";
  const events: GenerationEvent[] = [];
  for (const frame of frames) {
    const line = frame.split("\n").find((item) => item.startsWith("data: "));
    if (!line) continue;
    events.push(JSON.parse(line.slice(6)) as GenerationEvent);
  }
  return { events, remainder };
}
