import type { ImportStreamEvent } from "@groweasy/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ImportRequestError extends Error {}

/**
 * Streams `POST /api/import/process` as NDJSON: one JSON event per line, read incrementally via
 * `ReadableStream` so the UI gets progress as each batch finishes instead of waiting for the
 * whole file. Buffers partial lines across chunk boundaries (a chunk can split mid-line).
 */
export async function processImport(
  file: File,
  onEvent: (event: ImportStreamEvent) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/import/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok || !response.body) {
    let message = `Import request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new ImportRequestError(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as ImportStreamEvent);
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as ImportStreamEvent);
  }
}
