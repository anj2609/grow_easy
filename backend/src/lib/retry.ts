export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  /** Return false for errors that will never succeed on retry (e.g. quota exhausted) to fail fast instead of burning the remaining attempts. Defaults to always-retryable. */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Pick<RetryOptions, "attempts" | "baseDelayMs">> = {
  attempts: 3,
  baseDelayMs: 500,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries `fn` with exponential backoff (500ms, 1000ms, 2000ms, ...). Rethrows the last error once attempts are exhausted or `isRetryable` rejects the error. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { attempts, baseDelayMs, isRetryable } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && (!isRetryable || isRetryable(error));
      if (!canRetry) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
