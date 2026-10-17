/**
 * Osiris Whisper speech-to-text worker
 * onnx-community/whisper-small.en — free, on-device, no API key.
 * Better accuracy for Filipino-accented English than tiny/base.
 * Prefer WASM on Windows/Brave. English-only: no language/task options.
 */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "onnx-community/whisper-small.en";

let transcriber = null;
let loading = null;
let deviceUsed = "unknown";

function isWindows() {
  try {
    return /Windows/i.test(navigator.userAgent || "") || /Win/i.test(navigator.platform || "");
  } catch {
    return false;
  }
}

async function pickDevice() {
  if (isWindows()) return "wasm";

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

/** Peak-normalize so quiet mics still feed Whisper a strong signal. */
function normalizeAudio(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  if (peak < 1e-6) return samples;
  // Target ~0.9 peak; avoid clipping
  const gain = Math.min(0.9 / peak, 12);
  if (gain < 1.05) return samples;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * gain;
  }
  return out;
}

async function loadPipeline(device) {
  const opts = {
    device,
    progress_callback: (p) => {
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
  };

  if (device === "webgpu") {
    opts.dtype = {
      encoder_model: "fp32",
      decoder_model_merged: "q4",
    };
  } else {
    opts.dtype = "q8";
  }

  return pipeline("automatic-speech-recognition", MODEL_ID, opts);
}

async function getTranscriber() {
  if (transcriber) return transcriber;
  if (loading) return loading;

  loading = (async () => {
    let device = await pickDevice();
    deviceUsed = device;
    self.postMessage({ type: "status", status: "loading", device });

    try {
      transcriber = await loadPipeline(device);
    } catch (err) {
      if (device === "webgpu") {
        device = "wasm";
        deviceUsed = device;
        self.postMessage({ type: "status", status: "loading", device });
        transcriber = await loadPipeline(device);
      } else {
        throw err;
      }
    }

    try {
      await transcriber(new Float32Array(16000));
    } catch (_) {
      /* warm-up is best-effort */
    }

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

      const src = audio instanceof Float32Array ? audio : new Float32Array(audio.buffer || audio);
      let samples = new Float32Array(src.length);
      samples.set(src);

      if (samples.length < 1600) {
        self.postMessage({ type: "result", text: "" });
        return;
      }

      samples = normalizeAudio(samples);

      const pipe = await getTranscriber();

      let output;
      try {
        // English-only model: no language / task options
        output = await pipe(samples);
      } catch (inferErr) {
        transcriber = null;
        loading = null;
        const pipe2 = await getTranscriber();
        output = await pipe2(samples);
      }

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
