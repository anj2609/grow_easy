import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { CsvParseError } from "../services/csvParser";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof CsvParseError) {
    res.status(400).json({ error: { code: "invalid_csv", message: err.message } });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({ error: { code: "upload_error", message: err.message } });
    return;
  }

  if (err instanceof Error && err.message === "Only .csv files are supported") {
    res.status(400).json({ error: { code: "invalid_file_type", message: err.message } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong" } });
}
