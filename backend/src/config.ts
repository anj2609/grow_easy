import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  batchSize: Number(process.env.BATCH_SIZE ?? 25),
  batchConcurrency: Number(process.env.BATCH_CONCURRENCY ?? 3),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
};

export { requireEnv };
