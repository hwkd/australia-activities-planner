import { describe, expect, it } from "vitest";
import { readCapped } from "./body";

/** A request whose body arrives in chunks with no Content-Length, as a chunked upload does. */
const streamed = (...chunks: string[]) =>
  new Request("https://example.test/api/event", {
    method: "POST",
    body: new ReadableStream<Uint8Array>({
      start(c) {
        for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
        c.close();
      },
    }),
    // @ts-expect-error Node's fetch needs this for a stream body; Workers doesn't.
    duplex: "half",
  });

describe("readCapped (the event endpoint's body limit)", () => {
  it("reads a body under the limit, across chunks", async () => {
    expect(await readCapped(streamed('{"name":', '"plan_b_swap"}'), 1024)).toBe('{"name":"plan_b_swap"}');
  });
  it("stops at the limit without a Content-Length, counting bytes not characters", async () => {
    expect(await readCapped(streamed("x".repeat(600), "x".repeat(600)), 1024)).toBeNull();
    expect(await readCapped(streamed("é".repeat(513)), 1024)).toBeNull(); // 1,026 bytes, 513 characters
  });
  it("reads an empty body as empty", async () => {
    expect(await readCapped(new Request("https://example.test/", { method: "POST" }), 1024)).toBe("");
  });
});
