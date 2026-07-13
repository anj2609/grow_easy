import multer from "multer";
import { config } from "../config";

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/csv",
  "text/plain",
]);

export class InvalidFileTypeError extends Error {
  constructor() {
    super("Only .csv files are supported");
  }
}

/** Single-file `multipart/form-data` upload, field name `file`. Memory storage — the CSV is small and never touches disk. */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const isCsvExtension = file.originalname.toLowerCase().endsWith(".csv");
    const isCsvMime = ALLOWED_MIME_TYPES.has(file.mimetype);
    if (isCsvExtension || isCsvMime) {
      callback(null, true);
      return;
    }
    callback(new InvalidFileTypeError());
  },
}).single("file");
