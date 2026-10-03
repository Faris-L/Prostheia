import type { AnalysisMeshSnapshot, AnalysisRequest, AnalysisResponse, AnalysisResult } from "./types";

const jobs = new Map<string, { worker: Worker; cancel: () => void }>();

export function runAnalysis(request: Exclude<AnalysisRequest, { type: "ANALYSIS_CANCEL" }>, onProgress?: (progress: number) => void): Promise<AnalysisResult> {
  if (typeof Worker === "undefined") return Promise.reject(new Error("Analysis workers are unavailable in this browser."));
  const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
  return new Promise((resolve, reject) => {
    const finish = () => { worker.terminate(); jobs.delete(request.requestId); };
    jobs.set(request.requestId, { worker, cancel: () => { finish(); reject(new DOMException("Analysis cancelled.", "AbortError")); } });
    const listener = (event: MessageEvent<AnalysisResponse>) => {
      const message = event.data;
      if (message.requestId !== request.requestId) return;
      if (message.type === "ANALYSIS_PROGRESS") { onProgress?.(message.progress); return; }
      finish();
      if (message.type === "ANALYSIS_SUCCESS") resolve(message.result);
      else reject(new Error(message.message));
    };
    worker.addEventListener("message", listener);
    worker.addEventListener("error", (event) => { finish(); reject(new Error(event.message || "Analysis worker failed.")); }, { once: true });
    const transfer: Transferable[] = [];
    for (const target of request.targets) { transfer.push(target.positions.buffer, target.indices.buffer); }
    worker.postMessage(request, transfer);
  });
}

export function cancelAnalysis(requestId: string) { const job = jobs.get(requestId); if (!job) return; job.worker.postMessage({ type: "ANALYSIS_CANCEL", requestId }); job.cancel(); }
export function scalarRequest(requestId: string, kind: "contact" | "deviation", targets: [AnalysisMeshSnapshot, AnalysisMeshSnapshot], thresholdMm: number) { return { type: "ANALYSIS_REQUEST" as const, requestId, kind, targets, thresholdMm }; }
