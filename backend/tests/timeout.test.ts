import { describe, expect, it } from "vitest";
import { TimeoutError, withTimeout } from "../src/lib/timeout";

describe("withTimeout", () => {
  it("resolves with the value when the promise settles before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("done"), 100, "timed out");
    expect(result).toBe("done");
  });

  it("rejects with TimeoutError when the promise never settles in time", async () => {
    const neverResolves = new Promise(() => {});
    await expect(withTimeout(neverResolves, 20, "timed out")).rejects.toBeInstanceOf(TimeoutError);
  });

  it("propagates the original rejection when the promise rejects before the timeout", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 100, "timed out")).rejects.toThrow(
      "boom"
    );
  });
});
