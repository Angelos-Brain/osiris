/**
 * Osiris Whisper speech-to-text worker
 * Runs onnx-community/whisper-tiny.en fully in-browser via Transformers.js.
 * Free, no API key, WebGPU preferred with WASM fallback.
 * Model is cached by the browser after first download.
 */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "onnx-community/whisper-tiny.en";

let transcriber = null;
let loading = null;
let deviceUsed = "unknown";

async function pickDevice() {
  if (typeof navigator !== "undefined" && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    } catch (_) {
      /* fall through */
    }
  }
  return "wasm";
}

async function getTranscriber(progress_callback) {
  if (transcriber) return transcriber;
  if (loading) return loading;

  loading = (async () => {
    const device = await pickDevice();
    deviceUsed = device;
    self.postMessage({ type: "status", status: "loading", device });

    transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
      device,
      dtype: {
        encoder_model: "fp32",
        decoder_model_merged: "q4",
      },
      progress_callback: (p) => {
        if (progress_callback) progress_callback(p);
        if (p && typeof p.progress === "number") {
          self.postMessage({
            type: "progress",
            progress: Math.round(p.progress),
            file: p.file || "",
            status: p.status || "",
          });
        } else if (p && p.status) {
          self.postMessage({ type: "progress", status: p.status, file: p.file || "" });
        }
      },
    });

    self.postMessage({ type: "status", status: "ready", device: deviceUsed });
    return transcriber;
  })();

  try {
    return await loading;
  } catch (err) {
    loading = null;
    transcriber = null;
    self.postMessage({
      type: "error",
      message: "Model failed to download or load: " + (err?.message || String(err)),
    });
    throw err;
  }
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === "preload") {
      await getTranscriber();
      return;
    }

    if (msg.type === "transcribe") {
      const audio = msg.audio;
      if (!audio || (!(audio instanceof Float32Array) && !ArrayBuffer.isView(audio))) {
        self.postMessage({ type: "error", message: "No audio data received." });
        return;
      }
      const samples = audio instanceof Float32Array ? audio : new Float32Array(audio.buffer || audio);

      if (samples.length < 1600) {
        // < ~0.1 s at 16 kHz
        self.postMessage({ type: "result", text: "" });
        return;
      }

      const pipe = await getTranscriber();
      const output = await pipe(samples, {
        language: "english",
        task: "transcribe",
        return_timestamps: false,
      });

      const text = (output?.text || "").trim();
      self.postMessage({ type: "result", text });
      return;
    }

    if (msg.type === "info") {
      self.postMessage({
        type: "info",
        model: MODEL_ID,
        device: deviceUsed,
        ready: Boolean(transcriber),
      });
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err?.message || String(err),
    });
  }
};

self.postMessage({ type: "status", status: "booted" });
