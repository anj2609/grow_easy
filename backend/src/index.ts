import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { importRouter } from "./routes/import";
import { importRateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/import", importRateLimiter, importRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
