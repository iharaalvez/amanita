// Module-level Tesseract.js singleton. All OCR in the app shares one worker
// so the ~4MB language model is only downloaded and initialised once.

type OcrStatus = "idle" | "initializing" | "ready";

const statusListeners = new Set<(s: OcrStatus) => void>();
let currentStatus: OcrStatus = "idle";
let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

function broadcast(s: OcrStatus) {
  currentStatus = s;
  for (const fn of statusListeners) fn(s);
}

export function getOcrStatus(): OcrStatus {
  return currentStatus;
}

export function subscribeOcrStatus(fn: (s: OcrStatus) => void): () => void {
  statusListeners.add(fn);
  fn(currentStatus);
  return () => statusListeners.delete(fn);
}

export async function getOcrWorker(): Promise<import("tesseract.js").Worker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    broadcast("initializing");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, { logger: () => {} });
    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.'-: ",
      tessedit_pageseg_mode: "7",
    } as Parameters<typeof worker.setParameters>[0]);
    broadcast("ready");
    return worker;
  })();

  return workerPromise;
}

export async function runOcr(
  canvas: HTMLCanvasElement,
): Promise<{ text: string; confidence: number }> {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(canvas);
  return { text: data.text, confidence: data.confidence / 100 };
}
