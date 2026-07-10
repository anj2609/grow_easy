import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  aiProvider: (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  batchSize: Number(process.env.BATCH_SIZE ?? 25),
  batchConcurrency: Number(process.env.BATCH_CONCURRENCY ?? 3),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
};
