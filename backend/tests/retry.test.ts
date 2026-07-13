import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/lib/retry";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds once the underlying call recovers", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom again"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error once all attempts are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops after the first attempt when isRetryable rejects the error", async () => {
    class FatalError extends Error {}
    const fn = vi.fn().mockRejectedValue(new FatalError("not worth retrying"));

    await expect(
      withRetry(fn, { attempts: 3, baseDelayMs: 1, isRetryable: (err) => !(err instanceof FatalError) })
    ).rejects.toThrow("not worth retrying");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
