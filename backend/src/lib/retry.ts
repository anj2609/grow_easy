export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  attempts: 3,
  baseDelayMs: 500,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { attempts, baseDelayMs } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}
